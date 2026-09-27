const prisma = require('../utils/prisma');
const { success, error, paginated } = require('../utils/apiResponse');

exports.getParts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category, condition, motorId, lowStock, active } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      companyId: req.company.id,
      // Varsayılan olarak aktif ürünleri göster (active=false gelirse pasifler de dahil)
      ...(active !== 'false' && { isActive: true }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { partNumber: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
          { oemCode: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(category && { category }),
      ...(condition && { condition }),
      ...(motorId && { motorId }),
    };

    let parts, total;

    if (lowStock === 'true') {
      // Kritik stok filtreleme - JS tarafında yap
      const allParts = await prisma.part.findMany({
        where: { ...where, minQuantity: { gt: 0 } },
        include: {
          motor: { select: { id: true, brand: true, model: true, serialNumber: true } },
        },
        orderBy: { name: 'asc' },
      });
      parts = allParts.filter(p => p.quantity <= p.minQuantity);
      total = parts.length;
      parts = parts.slice(skip, skip + parseInt(limit));
    } else {
      [parts, total] = await Promise.all([
        prisma.part.findMany({
          where,
          skip: parseInt(skip),
          take: parseInt(limit),
          orderBy: { name: 'asc' },
          include: {
            motor: { select: { id: true, brand: true, model: true, serialNumber: true } },
            warehouseStocks: { include: { warehouse: { select: { name: true } } } },
          },
        }),
        prisma.part.count({ where }),
      ]);
    }

    return paginated(res, parts, total, page, limit, 'Parçalar listelendi.');
  } catch (err) {
    next(err);
  }
};

exports.getLowStockParts = async (req, res, next) => {
  try {
    // quantity <= minQuantity olan parçalar
    const parts = await prisma.$queryRaw`
      SELECT p.*, m.brand as motor_brand, m.model as motor_model
      FROM parts p
      LEFT JOIN motors m ON p."motorId" = m.id
      WHERE p."companyId" = ${req.company.id}
        AND p.quantity <= p."minQuantity"
        AND p."minQuantity" > 0
      ORDER BY (p.quantity - p."minQuantity") ASC
      LIMIT 50
    `;

    return success(res, parts, 'Düşük stok parçaları');
  } catch (err) {
    next(err);
  }
};

exports.getPartsStats = async (req, res, next) => {
  try {
    const companyId = req.company.id;

    const [totalParts, totalValue, lowStockCount, categories] = await Promise.all([
      prisma.part.count({ where: { companyId } }),
      prisma.part.aggregate({
        where: { companyId },
        _sum: { purchasePrice: true },
      }),
      prisma.$queryRaw`
        SELECT COUNT(*) as count FROM parts
        WHERE "companyId" = ${companyId} AND quantity <= "minQuantity" AND "minQuantity" > 0
      `,
      prisma.part.groupBy({
        by: ['category'],
        where: { companyId },
        _count: { id: true },
      }),
    ]);

    return success(res, {
      totalParts,
      totalValue: totalValue._sum.purchasePrice,
      lowStockCount: parseInt(lowStockCount[0]?.count || 0),
      categories,
    });
  } catch (err) {
    next(err);
  }
};

exports.getPartById = async (req, res, next) => {
  try {
    const part = await prisma.part.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
      include: {
        motor: { select: { id: true, brand: true, model: true, serialNumber: true } },
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { user: { select: { fullName: true } } },
        },
        warehouseStocks: { include: { warehouse: { select: { name: true } } } },
      },
    });

    if (!part) return error(res, 'Parça bulunamadı.', 404);
    return success(res, part);
  } catch (err) {
    next(err);
  }
};

exports.getPartMovements = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const part = await prisma.part.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!part) return error(res, 'Parça bulunamadı.', 404);

    const [movements, total] = await Promise.all([
      prisma.partMovement.findMany({
        where: { partId: req.params.id },
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true } },
          motor: { select: { brand: true, model: true, serialNumber: true } },
        },
      }),
      prisma.partMovement.count({ where: { partId: req.params.id } }),
    ]);

    return paginated(res, movements, total, page, limit);
  } catch (err) {
    next(err);
  }
};

exports.createPart = async (req, res, next) => {
  try {
    const {
      motorId, partNumber, sku, barcode, oemCode,
      name, brand, category, quantity,
      unit, minQuantity, maxQuantity, purchasePrice, sellingPrice,
      warehouseLocation, condition, notes,
    } = req.body;

    // Motor varsa şirkete ait mi kontrol et
    if (motorId) {
      const motor = await prisma.motor.findFirst({
        where: { id: motorId, companyId: req.company.id },
      });
      if (!motor) return error(res, 'Motor bulunamadı.', 404);
    }

    const part = await prisma.part.create({
      data: {
        companyId: req.company.id,
        motorId: motorId || null,
        partNumber, sku, barcode, oemCode,
        name, brand, category,
        quantity: parseInt(quantity) || 0,
        unit: unit || 'adet',
        minQuantity: parseInt(minQuantity) || 0,
        maxQuantity: maxQuantity ? parseInt(maxQuantity) : null,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        sellingPrice: sellingPrice ? parseFloat(sellingPrice) : null,
        warehouseLocation, condition: condition || 'NEW', notes,
        isActive: true,
      },
    });

    // Başlangıç stok hareketi kaydet ve depo stokunu güncelle
    if (parseInt(quantity) > 0) {
      const warehouse = req.body.warehouseId
        ? await prisma.warehouse.findFirst({ where: { id: req.body.warehouseId, companyId: req.company.id } })
        : await prisma.warehouse.findFirst({ where: { isDefault: true, companyId: req.company.id } });
      const wId = warehouse?.id;

      await prisma.$transaction([
        prisma.partMovement.create({
          data: {
            partId: part.id,
            warehouseId: wId,
            userId: req.user.id,
            movementType: 'IN',
            quantity: parseInt(quantity),
            notes: 'İlk stok girişi',
          },
        }),
        ...(wId ? [
          prisma.warehouseStock.upsert({
            where: { warehouseId_partId: { warehouseId: wId, partId: part.id } },
            update: { quantity: { increment: parseInt(quantity) } },
            create: { warehouseId: wId, partId: part.id, quantity: parseInt(quantity) }
          })
        ] : [])
      ]);
    }

    return success(res, part, 'Parça başarıyla oluşturuldu.', 201);
  } catch (err) {
    next(err);
  }
};

exports.updatePart = async (req, res, next) => {
  try {
    const existing = await prisma.part.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!existing) return error(res, 'Parça bulunamadı.', 404);

    const {
      motorId, partNumber, sku, barcode, oemCode,
      name, brand, category, quantity,
      unit, minQuantity, maxQuantity, purchasePrice, sellingPrice,
      warehouseLocation, condition, notes, isActive,
    } = req.body;

    const part = await prisma.part.update({
      where: { id: req.params.id },
      data: {
        motorId: motorId !== undefined ? motorId || null : undefined,
        partNumber: partNumber !== undefined ? partNumber : undefined,
        sku: sku !== undefined ? sku : undefined,
        barcode: barcode !== undefined ? barcode : undefined,
        oemCode: oemCode !== undefined ? oemCode : undefined,
        name: name !== undefined ? name : undefined,
        brand: brand !== undefined ? brand : undefined,
        category: category !== undefined ? category : undefined,
        quantity: quantity !== undefined ? parseInt(quantity) : undefined,
        unit: unit !== undefined ? unit : undefined,
        minQuantity: minQuantity !== undefined ? parseInt(minQuantity) : undefined,
        maxQuantity: maxQuantity !== undefined ? (maxQuantity ? parseInt(maxQuantity) : null) : undefined,
        purchasePrice: purchasePrice !== undefined ? (purchasePrice ? parseFloat(purchasePrice) : null) : undefined,
        sellingPrice: sellingPrice !== undefined ? (sellingPrice ? parseFloat(sellingPrice) : null) : undefined,
        warehouseLocation: warehouseLocation !== undefined ? warehouseLocation : undefined,
        condition: condition !== undefined ? condition : undefined,
        notes: notes !== undefined ? notes : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    return success(res, part, 'Parça güncellendi.');
  } catch (err) {
    next(err);
  }
};

exports.deletePart = async (req, res, next) => {
  try {
    const existing = await prisma.part.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!existing) return error(res, 'Parça bulunamadı.', 404);
    // Silmek yerine pasifleştir (stok geçmişi korunsun)
    await prisma.part.update({ 
      where: { id: req.params.id },
      data: { isActive: false },
    });
    return success(res, null, 'Parça pasifleştirildi.');
  } catch (err) {
    next(err);
  }
};

exports.addMovement = async (req, res, next) => {
  try {
    const { movementType, quantity, motorId, warehouseId, notes, unitCost, referenceType, referenceId } = req.body;

    const part = await prisma.part.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!part) return error(res, 'Parça bulunamadı.', 404);

    const qty = parseInt(quantity);

    // Çıkış türleri
    const outTypes = ['OUT', 'TRANSFER', 'IS_EMRI_KULLANIMI', 'SATIS', 'FIRE'];
    const inTypes = ['IN', 'RETURN', 'SATIN_ALMA', 'IADE'];

    if (outTypes.includes(movementType)) {
      const available = part.quantity - part.reservedQuantity;
      if (available < qty) {
        return error(
          res,
          `Yetersiz kullanılabilir stok. Kullanılabilir: ${available} ${part.unit} (Toplam: ${part.quantity}, Rezerve: ${part.reservedQuantity})`,
          400
        );
      }
    }

    // Stok değişiklik miktarı hesapla
    const isOut = outTypes.includes(movementType);
    const quantityChange = isOut ? -qty : qty;

    const warehouse = warehouseId 
      ? await prisma.warehouse.findFirst({ where: { id: warehouseId, companyId: req.company.id } }) 
      : await prisma.warehouse.findFirst({ where: { isDefault: true, companyId: req.company.id } });
    const wId = warehouse?.id;

    await prisma.$transaction([
      prisma.part.update({
        where: { id: part.id },
        data: { quantity: { increment: quantityChange } },
      }),
      prisma.partMovement.create({
        data: {
          partId: part.id,
          warehouseId: wId,
          userId: req.user.id,
          motorId: motorId || null,
          movementType,
          quantity: qty,
          unitCost: unitCost ? parseFloat(unitCost) : null,
          referenceType: referenceType || null,
          referenceId: referenceId || null,
          notes,
        },
      }),
      ...(wId ? [
        prisma.warehouseStock.upsert({
          where: { warehouseId_partId: { warehouseId: wId, partId: part.id } },
          update: { quantity: { increment: quantityChange } },
          create: { warehouseId: wId, partId: part.id, quantity: Math.max(0, quantityChange) },
        })
      ] : [])
    ]);

    const updatedPart = await prisma.part.findUnique({ 
      where: { id: part.id },
      include: {
        warehouseStocks: { include: { warehouse: { select: { name: true } } } },
      }
    });
    return success(res, updatedPart, 'Stok hareketi kaydedildi.');
  } catch (err) {
    next(err);
  }
};
