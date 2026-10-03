const prisma = require('../utils/prisma');
const { success, error } = require('../utils/apiResponse');

// ─── Stok Girişi (Satın Alma) ─────────────────────────────────────────────────
exports.purchaseStock = async (req, res, next) => {
  try {
    const {
      partId,
      quantity,
      unitCost,
      supplierId,
      warehouseId,
      shelfLocation,
      paymentMethod = 'CARI', // 'CARI', 'NAKIT', 'KREDI_KARTI', 'HAVALE'
      invoiceNumber,
      notes,
    } = req.body;

    const part = await prisma.part.findFirst({
      where: { id: partId, companyId: req.company.id },
    });
    if (!part) return error(res, 'Parça bulunamadı.', 404);

    const qty = parseInt(quantity);
    const cost = parseFloat(unitCost);

    if (qty <= 0) return error(res, 'Miktar 0\'dan büyük olmalı.', 400);
    if (isNaN(cost) || cost < 0) return error(res, 'Geçerli bir alış fiyatı girin.', 400);

    // Tedarikçi kontrolü
    let supplier = null;
    if (supplierId) {
      supplier = await prisma.supplier.findFirst({
        where: { id: supplierId, companyId: req.company.id },
      });
      if (!supplier) return error(res, 'Tedarikçi bulunamadı.', 404);
    }

    const totalCost = qty * cost;

    const warehouse = warehouseId 
      ? await prisma.warehouse.findFirst({ where: { id: warehouseId, companyId: req.company.id } }) 
      : await prisma.warehouse.findFirst({ where: { isDefault: true, companyId: req.company.id } });
    const wId = warehouse?.id;

    const isPaidImmediately = ['NAKIT', 'KREDI_KARTI', 'HAVALE'].includes(paymentMethod);

    // Transaction işlemleri
    const operations = [
      prisma.part.update({
        where: { id: partId },
        data: {
          quantity: { increment: qty },
          purchasePrice: cost,
          ...(shelfLocation ? { warehouseLocation: shelfLocation.trim() } : {}),
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
          documentNo: invoiceNumber || null,
          notes: notes || `${qty} adet satın alındı${supplier ? ` (${supplier.name})` : ''} [Ödeme: ${paymentMethod}]`,
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
          invoiceNumber: invoiceNumber || null,
          notes: notes ? `${notes} (Ödeme: ${paymentMethod})` : `Ödeme: ${paymentMethod}`,
        },
      }),
    ];

    // Depo bazında stok ve raf konumu
    if (wId) {
      operations.push(
        prisma.warehouseStock.upsert({
          where: { warehouseId_partId: { warehouseId: wId, partId } },
          update: {
            quantity: { increment: qty },
            ...(shelfLocation ? { shelfLocation: shelfLocation.trim() } : {}),
          },
          create: {
            warehouseId: wId,
            partId,
            quantity: qty,
            shelfLocation: shelfLocation ? shelfLocation.trim() : null,
          },
        })
      );
    }

    // Tedarikçi işlemleri
    if (supplierId) {
      if (isPaidImmediately) {
        // Peşin ödendiyse cari bakiye borç olarak kalmaz; hem ALIS hem ODEME yazılır
        operations.push(
          prisma.supplierTransaction.create({
            data: {
              companyId: req.company.id,
              supplierId,
              userId: req.user.id,
              type: 'ALIS',
              amount: totalCost,
              documentNo: invoiceNumber || null,
              notes: notes || `${part.name} - ${qty} ${part.unit} peşin alımı`,
            },
          }),
          prisma.supplierTransaction.create({
            data: {
              companyId: req.company.id,
              supplierId,
              userId: req.user.id,
              type: 'ODEME',
              amount: totalCost,
              paymentMethod,
              documentNo: invoiceNumber || null,
              notes: `Peşin ödeme (${paymentMethod})`,
            },
          })
        );
      } else {
        // Cari (Açık hesap / veresiye): Borç artırılır
        operations.push(
          prisma.supplier.update({
            where: { id: supplierId },
            data: { balance: { increment: totalCost } },
          }),
          prisma.supplierTransaction.create({
            data: {
              companyId: req.company.id,
              supplierId,
              userId: req.user.id,
              type: 'ALIS',
              amount: totalCost,
              documentNo: invoiceNumber || null,
              notes: notes || `${part.name} - ${qty} ${part.unit} cari alımı (Veresiye)`,
            },
          })
        );
      }
    }

    // Dükkan kasasından peşin nakit/kart ödendiyse Kasa Hareketi (OUT) oluştur
    if (isPaidImmediately && totalCost > 0) {
      operations.push(
        prisma.cashTransaction.create({
          data: {
            companyId: req.company.id,
            userId: req.user.id,
            type: 'OUT',
            category: 'MALZEME',
            amount: totalCost,
            paymentMethod,
            documentNo: invoiceNumber || null,
            description: `${part.name} - ${qty} ${part.unit} peşin alımı${supplier ? ` (${supplier.name})` : ''}`,
          },
        })
      );
    }

    const results = await prisma.$transaction(operations);
    const updatedPart = results[0];
    const movement = results[1];
    const purchase = results[2];

    return success(res, {
      part: updatedPart,
      movement,
      purchase,
    }, `${qty} adet stok girişi yapıldı (${paymentMethod}). Yeni stok: ${updatedPart.quantity} ${updatedPart.unit}`, 201);
  } catch (err) {
    next(err);

  }
};

// ─── Manuel Stok Çıkışı ───────────────────────────────────────────────────────
exports.stockOut = async (req, res, next) => {
  try {
    const { partId, quantity, reason, warehouseId, notes, supplierId, documentNo } = req.body;

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

    // Tedarikçi bilgisi (varsa)
    let supplier = null;
    if (supplierId) {
      supplier = await prisma.supplier.findFirst({
        where: { id: supplierId, companyId: req.company.id },
      });
    }

    // Hareket tipi belirleme
    const movementTypeMap = {
      FIRE: 'FIRE',
      SATIS: 'SATIS',
      DUZELTME: 'DUZELTME',
      IADE: 'IADE',
      TEDARIKCIYE_IADE: 'IADE',
      ATOLYE_SARFI: 'ATOLYE_SARFI',
      SARF: 'ATOLYE_SARFI',
    };
    const isSupplierReturn = reason === 'IADE' || reason === 'TEDARIKCIYE_IADE';
    const isWorkshopConsumable = reason === 'ATOLYE_SARFI' || reason === 'SARF';
    const movementType = movementTypeMap[reason] || 'OUT';

    const warehouse = warehouseId 
      ? await prisma.warehouse.findFirst({ where: { id: warehouseId, companyId: req.company.id } }) 
      : await prisma.warehouse.findFirst({ where: { isDefault: true, companyId: req.company.id } });
    const wId = warehouse?.id;

    const defaultNotes = isSupplierReturn
      ? (supplier ? `Tedarikçiye İade: ${supplier.name}` : 'Parçacıya İade Edildi')
      : isWorkshopConsumable
      ? 'Atölye Sarf Malzemesi Çıkışı (Balata Spreyi, Sıvı Conta vb.)'
      : `Manuel stok çıkışı: ${reason}`;

    const returnAmount = isSupplierReturn
      ? (part.purchasePrice ? parseFloat(part.purchasePrice) * qty : 0)
      : 0;

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
          referenceType: isSupplierReturn ? 'SUPPLIER_RETURN' : isWorkshopConsumable ? 'WORKSHOP_CONSUMPTION' : null,
          referenceId: supplierId || null,
          documentNo: documentNo || null,
          notes: notes || defaultNotes,
        },
      }),
      ...(wId ? [
        prisma.warehouseStock.upsert({
          where: { warehouseId_partId: { warehouseId: wId, partId } },
          update: { quantity: { decrement: qty } },
          create: { warehouseId: wId, partId, quantity: 0 }
        })
      ] : []),
      // Parçacıya iade ise parçacı carisinden düş ve iade hareketi yaz
      ...(supplierId && returnAmount > 0 ? [
        prisma.supplier.update({
          where: { id: supplierId },
          data: { balance: { decrement: returnAmount } },
        }),
        prisma.supplierTransaction.create({
          data: {
            companyId: req.company.id,
            supplierId,
            userId: req.user.id,
            type: 'IADE',
            amount: returnAmount,
            documentNo: documentNo || null,
            notes: notes || `${part.name} - ${qty} ${part.unit} parçacıya iade edildi`,
          },
        }),
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

// ─── Atölye Hızlı Sarfiyat Toplu Çıkışı (Sanayi Hızlı Sarf Fişi) ──────────────
exports.batchConsumeWorkshop = async (req, res, next) => {
  try {
    const { items, warehouseId, notes } = req.body;
    // items: [{ partId: string, quantity: number }]
    if (!Array.isArray(items) || items.length === 0) {
      return error(res, 'Sarfiyat listesi boş olamaz.', 400);
    }

    const warehouse = warehouseId
      ? await prisma.warehouse.findFirst({ where: { id: warehouseId, companyId: req.company.id } })
      : await prisma.warehouse.findFirst({
          where: {
            companyId: req.company.id,
            OR: [{ type: 'WORKSHOP_CONSUMABLES' }, { isDefault: true }],
          },
          orderBy: [{ isDefault: 'desc' }],
        });
    const wId = warehouse?.id;

    const operations = [];
    const consumedDetails = [];

    for (const item of items) {
      const qty = parseInt(item.quantity);
      if (!qty || qty <= 0) continue;

      const part = await prisma.part.findFirst({
        where: { id: item.partId, companyId: req.company.id },
      });
      if (!part) continue;

      operations.push(
        prisma.part.update({
          where: { id: part.id },
          data: { quantity: { decrement: qty } },
        })
      );

      operations.push(
        prisma.partMovement.create({
          data: {
            partId: part.id,
            warehouseId: wId || null,
            userId: req.user.id,
            movementType: 'ATOLYE_SARFI',
            quantity: qty,
            referenceType: 'WORKSHOP_CONSUMPTION',
            notes: notes || `Atölye Hızlı Sarfiyatı (${warehouse?.name || 'Depo'})`,
          },
        })
      );

      if (wId) {
        operations.push(
          prisma.warehouseStock.upsert({
            where: { warehouseId_partId: { warehouseId: wId, partId: part.id } },
            update: { quantity: { decrement: qty } },
            create: { warehouseId: wId, partId: part.id, quantity: 0 },
          })
        );
      }

      consumedDetails.push({ name: part.name, quantity: qty, unit: part.unit });
    }

    if (operations.length === 0) {
      return error(res, 'Geçerli bir sarf miktarı girilmedi.', 400);
    }

    await prisma.$transaction(operations);

    return success(
      res,
      { consumedCount: consumedDetails.length, consumedDetails },
      `${consumedDetails.length} kalem sarf malzemesi başarıyla atölye sarfiyatı olarak düşüldü.`
    );
  } catch (err) {
    next(err);
  }
};

