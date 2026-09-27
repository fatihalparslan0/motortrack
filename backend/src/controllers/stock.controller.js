const prisma = require('../utils/prisma');
const { success, error } = require('../utils/apiResponse');

// ─── Stok Girişi (Satın Alma) ─────────────────────────────────────────────────
exports.purchaseStock = async (req, res, next) => {
  try {
    const { partId, quantity, unitCost, supplierId, warehouseId, notes } = req.body;

    const part = await prisma.part.findFirst({
      where: { id: partId, companyId: req.company.id },
    });
    if (!part) return error(res, 'Parça bulunamadı.', 404);

    const qty = parseInt(quantity);
    const cost = parseFloat(unitCost);

    if (qty <= 0) return error(res, 'Miktar 0\'dan büyük olmalı.', 400);
    if (isNaN(cost) || cost < 0) return error(res, 'Geçerli bir alış fiyatı girin.', 400);

    // Tedarikçi kontrolü
    if (supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: supplierId, companyId: req.company.id },
      });
      if (!supplier) return error(res, 'Tedarikçi bulunamadı.', 404);
    }

    const totalCost = qty * cost;

    const warehouse = warehouseId 
      ? await prisma.warehouse.findFirst({ where: { id: warehouseId, companyId: req.company.id } }) 
      : await prisma.warehouse.findFirst({ where: { isDefault: true, companyId: req.company.id } });
    const wId = warehouse?.id;

    // Transaction: stok artır + hareket kaydet + satın alma kaydı oluştur + depo stoku
    const [updatedPart, movement, purchase, wStock] = await prisma.$transaction([
      prisma.part.update({
        where: { id: partId },
        data: {
          quantity: { increment: qty },
          purchasePrice: cost,
        },
      }),
      prisma.partMovement.create({
        data: {
          partId,
          warehouseId: wId,
          userId: req.user.id,
          movementType: 'SATIN_ALMA',
          quantity: qty,
          unitCost: cost,
          referenceType: 'PURCHASE',
          notes: notes || `${qty} adet satın alındı${supplierId ? ' (tedarikçiden)' : ''}`,
        },
      }),
      prisma.purchaseRecord.create({
        data: {
          companyId: req.company.id,
          partId,
          supplierId: supplierId || null,
          userId: req.user.id,
          quantity: qty,
          unitCost: cost,
          totalCost,
          notes,
        },
      }),
      // Depo stokunu güncelle
      wId ? prisma.warehouseStock.upsert({
        where: { warehouseId_partId: { warehouseId: wId, partId } },
        update: { quantity: { increment: qty } },
        create: { warehouseId: wId, partId, quantity: qty }
      }) : prisma.part.findUnique({ where: { id: partId } })
    ]);

    return success(res, {
      part: updatedPart,
      movement,
      purchase,
    }, `${qty} adet stok girişi yapıldı. Yeni stok: ${updatedPart.quantity} ${updatedPart.unit}`, 201);
  } catch (err) {
    next(err);
  }
};

// ─── Manuel Stok Çıkışı ───────────────────────────────────────────────────────
exports.stockOut = async (req, res, next) => {
  try {
    const { partId, quantity, reason, warehouseId, notes } = req.body;

    const part = await prisma.part.findFirst({
      where: { id: partId, companyId: req.company.id },
    });
    if (!part) return error(res, 'Parça bulunamadı.', 404);

    const qty = parseInt(quantity);
    if (qty <= 0) return error(res, 'Miktar 0\'dan büyük olmalı.', 400);

    // Kullanılabilir stok kontrolü
    const available = part.quantity - part.reservedQuantity;
    if (available < qty) {
      return error(
        res,
        `Yetersiz kullanılabilir stok. Kullanılabilir: ${available} ${part.unit} (Toplam: ${part.quantity}, Rezerve: ${part.reservedQuantity})`,
        400
      );
    }

    // Hareket tipi belirleme
    const movementTypeMap = {
      FIRE: 'FIRE',
      SATIS: 'SATIS',
      DUZELTME: 'DUZELTME',
    };
    const movementType = movementTypeMap[reason] || 'OUT';

    const warehouse = warehouseId 
      ? await prisma.warehouse.findFirst({ where: { id: warehouseId, companyId: req.company.id } }) 
      : await prisma.warehouse.findFirst({ where: { isDefault: true, companyId: req.company.id } });
    const wId = warehouse?.id;

    const [updatedPart, movement] = await prisma.$transaction([
      prisma.part.update({
        where: { id: partId },
        data: { quantity: { decrement: qty } },
      }),
      prisma.partMovement.create({
        data: {
          partId,
          warehouseId: wId,
          userId: req.user.id,
          movementType,
          quantity: qty,
          notes: notes || `Manuel stok çıkışı: ${reason}`,
        },
      }),
      ...(wId ? [
        prisma.warehouseStock.upsert({
          where: { warehouseId_partId: { warehouseId: wId, partId } },
          update: { quantity: { decrement: qty } },
          create: { warehouseId: wId, partId, quantity: 0 }
        })
      ] : [])
    ]);

    return success(res, {
      part: updatedPart,
      movement,
    }, `${qty} adet stok çıkışı yapıldı. Yeni stok: ${updatedPart.quantity} ${updatedPart.unit}`);
  } catch (err) {
    next(err);
  }
};

// ─── Depolar Arası Stok Transferi ───────────────────────────────────────────
exports.transferStock = async (req, res, next) => {
  try {
    const { partId, fromWarehouseId, toWarehouseId, quantity, notes } = req.body;
    const qty = parseInt(quantity);
    if (!partId) return error(res, 'Parça seçilmelidir.', 400);
    if (!fromWarehouseId || !toWarehouseId) return error(res, 'Kaynak ve hedef depo seçilmelidir.', 400);
    if (fromWarehouseId === toWarehouseId) return error(res, 'Kaynak ve hedef depo aynı olamaz.', 400);
    if (isNaN(qty) || qty <= 0) return error(res, 'Geçerli bir transfer miktarı girin.', 400);

    const part = await prisma.part.findFirst({
      where: { id: partId, companyId: req.company.id },
    });
    if (!part) return error(res, 'Parça bulunamadı.', 404);

    const [fromW, toW] = await Promise.all([
      prisma.warehouse.findFirst({ where: { id: fromWarehouseId, companyId: req.company.id } }),
      prisma.warehouse.findFirst({ where: { id: toWarehouseId, companyId: req.company.id } }),
    ]);
    if (!fromW || !toW) return error(res, 'Geçersiz depo seçimi.', 404);

    // Kaynak depoda yeterli stok var mı?
    const sourceStock = await prisma.warehouseStock.findUnique({
      where: { warehouseId_partId: { warehouseId: fromWarehouseId, partId } },
    });
    if (!sourceStock || sourceStock.quantity < qty) {
      return error(res, `Kaynak depoda (${fromW.name}) yeterli stok yok. Mevcut: ${sourceStock?.quantity || 0} ${part.unit}`, 400);
    }

    // Transfer transaction: kaynak azalt, hedef artır, hareket kaydet
    await prisma.$transaction([
      prisma.warehouseStock.update({
        where: { warehouseId_partId: { warehouseId: fromWarehouseId, partId } },
        data: { quantity: { decrement: qty } },
      }),
      prisma.warehouseStock.upsert({
        where: { warehouseId_partId: { warehouseId: toWarehouseId, partId } },
        update: { quantity: { increment: qty } },
        create: { warehouseId: toWarehouseId, partId, quantity: qty },
      }),
      prisma.partMovement.create({
        data: {
          partId,
          warehouseId: toWarehouseId,
          userId: req.user.id,
          movementType: 'DEPO_TRANSFERI',
          quantity: qty,
          notes: notes || `${fromW.name} ➔ ${toW.name} transferi`,
        },
      }),
    ]);

    return success(res, null, `${qty} ${part.unit} "${fromW.name}" deposundan "${toW.name}" deposuna aktarıldı.`);
  } catch (err) {
    next(err);
  }
};

// ─── Depo Stoklarını Doğrudan Düzenleme / Sayım ─────────────────────────────
exports.adjustWarehouseStocks = async (req, res, next) => {
  try {
    const { partId, warehouseStocks, notes } = req.body;
    // warehouseStocks: [{ warehouseId: string, quantity: number }]
    if (!partId) return error(res, 'Parça ID zorunludur.', 400);
    if (!Array.isArray(warehouseStocks)) return error(res, 'Depo stok listesi geçersiz.', 400);

    const part = await prisma.part.findFirst({
      where: { id: partId, companyId: req.company.id },
    });
    if (!part) return error(res, 'Parça bulunamadı.', 404);

    let totalQuantity = 0;
    const operations = [];

    for (const ws of warehouseStocks) {
      const q = Math.max(0, parseInt(ws.quantity) || 0);
      totalQuantity += q;
      operations.push(
        prisma.warehouseStock.upsert({
          where: { warehouseId_partId: { warehouseId: ws.warehouseId, partId } },
          update: { quantity: q },
          create: { warehouseId: ws.warehouseId, partId, quantity: q },
        })
      );
    }

    // Parça toplam stok miktarını depoların toplamına eşitle
    operations.push(
      prisma.part.update({
        where: { id: partId },
        data: { quantity: totalQuantity },
      })
    );

    const diff = totalQuantity - part.quantity;
    operations.push(
      prisma.partMovement.create({
        data: {
          partId,
          userId: req.user.id,
          movementType: 'DUZELTME',
          quantity: Math.abs(diff) || 1,
          notes: notes || `Depo sayımı ve miktar düzenlemesi. Yeni toplam stok: ${totalQuantity} ${part.unit}`,
        },
      })
    );

    await prisma.$transaction(operations);

    const updated = await prisma.part.findUnique({
      where: { id: partId },
      include: {
        warehouseStocks: { include: { warehouse: { select: { name: true } } } },
      },
    });

    return success(res, updated, `Depo stokları başarıyla güncellendi. Toplam stok: ${totalQuantity} ${part.unit}`);
  } catch (err) {
    next(err);
  }
};

// ─── Barkod / SKU ile Ürün Ara ────────────────────────────────────────────────
exports.findByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;

    const part = await prisma.part.findFirst({
      where: {
        companyId: req.company.id,
        isActive: true,
        OR: [
          { barcode: barcode },
          { sku: barcode },
          { oemCode: barcode },
          { partNumber: barcode },
        ],
      },
      include: {
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { user: { select: { fullName: true } } },
        },
      },
    });

    if (!part) return error(res, 'Barkod ile eşleşen ürün bulunamadı.', 404);
    return success(res, part);
  } catch (err) {
    next(err);
  }
};

// ─── Stok Hareketleri Listesi ────────────────────────────────────────────────
exports.getMovements = async (req, res, next) => {
  try {
    const { warehouseId, partId, movementType, search, limit = 100 } = req.query;

    const filter = {
      part: { companyId: req.company.id },
    };

    if (partId) filter.partId = partId;

    // Hareket tipi filtreleme
    if (movementType) {
      if (movementType === 'TRANSFER') {
        filter.movementType = { in: ['DEPO_TRANSFERI', 'TRANSFER'] };
      } else if (movementType === 'IN') {
        filter.movementType = { in: ['SATIN_ALMA', 'IN', 'IADE'] };
      } else if (movementType === 'OUT') {
        filter.movementType = { in: ['IS_EMRI_KULLANIMI', 'SATIS', 'FIRE', 'OUT'] };
      } else if (movementType === 'ADJUSTMENT') {
        filter.movementType = { in: ['DUZELTME', 'ADJUSTMENT'] };
      } else {
        filter.movementType = movementType;
      }
    }

    // Depo filtreleme
    if (warehouseId) {
      const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
      if (warehouse) {
        filter.OR = [
          { warehouseId: warehouseId },
          { notes: { contains: warehouse.name, mode: 'insensitive' } },
        ];
      } else {
        filter.warehouseId = warehouseId;
      }
    }

    // Parça veya notlarda arama
    if (search && search.trim()) {
      const term = search.trim();
      const searchConditions = [
        { part: { name: { contains: term, mode: 'insensitive' } } },
        { part: { brand: { contains: term, mode: 'insensitive' } } },
        { part: { sku: { contains: term, mode: 'insensitive' } } },
        { part: { partNumber: { contains: term, mode: 'insensitive' } } },
        { notes: { contains: term, mode: 'insensitive' } },
      ];

      if (filter.OR) {
        filter.AND = [
          { OR: filter.OR },
          { OR: searchConditions },
        ];
        delete filter.OR;
      } else {
        filter.OR = searchConditions;
      }
    }

    const movements = await prisma.partMovement.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit) || 100,
      include: {
        part: { select: { name: true, unit: true, sku: true, partNumber: true, brand: true } },
        user: { select: { fullName: true } },
        warehouse: { select: { name: true } },
      },
    });

    return success(res, movements);
  } catch (err) {
    next(err);
  }
};
