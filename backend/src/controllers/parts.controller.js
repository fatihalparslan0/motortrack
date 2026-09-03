const prisma = require('../utils/prisma');
const { success, error, paginated } = require('../utils/apiResponse');

exports.getParts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category, condition, motorId, lowStock } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      companyId: req.company.id,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { partNumber: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(category && { category }),
      ...(condition && { condition }),
      ...(motorId && { motorId }),
      ...(lowStock === 'true' && {
        AND: [{ quantity: { lte: prisma.part.fields.minQuantity } }],
      }),
    };

    const [parts, total] = await Promise.all([
      prisma.part.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { name: 'asc' },
        include: {
          motor: { select: { id: true, brand: true, model: true, serialNumber: true } },
        },
      }),
      prisma.part.count({ where }),
    ]);

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
      LEFT JOIN motors m ON p.motor_id = m.id
      WHERE p.company_id = ${req.company.id}
        AND p.quantity <= p.min_quantity
        AND p.min_quantity > 0
      ORDER BY (p.quantity - p.min_quantity) ASC
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
        WHERE company_id = ${companyId} AND quantity <= min_quantity AND min_quantity > 0
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
      motorId, partNumber, name, brand, category, quantity,
      unit, minQuantity, purchasePrice, sellingPrice,
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
        partNumber, name, brand, category,
        quantity: parseInt(quantity) || 0,
        unit: unit || 'adet',
        minQuantity: parseInt(minQuantity) || 0,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        sellingPrice: sellingPrice ? parseFloat(sellingPrice) : null,
        warehouseLocation, condition: condition || 'NEW', notes,
      },
    });

    // Başlangıç stok hareketi kaydet
    if (parseInt(quantity) > 0) {
      await prisma.partMovement.create({
        data: {
          partId: part.id,
          userId: req.user.id,
          movementType: 'IN',
          quantity: parseInt(quantity),
          notes: 'İlk stok girişi',
        },
      });
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

    const part = await prisma.part.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        quantity: req.body.quantity !== undefined ? parseInt(req.body.quantity) : undefined,
        minQuantity: req.body.minQuantity !== undefined ? parseInt(req.body.minQuantity) : undefined,
        purchasePrice: req.body.purchasePrice ? parseFloat(req.body.purchasePrice) : undefined,
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
    await prisma.part.delete({ where: { id: req.params.id } });
    return success(res, null, 'Parça silindi.');
  } catch (err) {
    next(err);
  }
};

exports.addMovement = async (req, res, next) => {
  try {
    const { movementType, quantity, motorId, notes } = req.body;

    const part = await prisma.part.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!part) return error(res, 'Parça bulunamadı.', 404);

    const qty = parseInt(quantity);

    // Stok çıkışında yeterli stok kontrolü
    if (['OUT', 'TRANSFER'].includes(movementType) && part.quantity < qty) {
      return error(res, `Yetersiz stok. Mevcut: ${part.quantity} ${part.unit}`, 400);
    }

    // Stok güncelle
    const quantityChange = movementType === 'IN' || movementType === 'RETURN'
      ? qty
      : movementType === 'OUT' || movementType === 'TRANSFER'
        ? -qty
        : qty; // ADJUSTMENT

    await prisma.$transaction([
      prisma.part.update({
        where: { id: part.id },
        data: { quantity: { increment: quantityChange } },
      }),
      prisma.partMovement.create({
        data: {
          partId: part.id,
          userId: req.user.id,
          motorId: motorId || null,
          movementType,
          quantity: qty,
          notes,
        },
      }),
    ]);

    const updatedPart = await prisma.part.findUnique({ where: { id: part.id } });
    return success(res, updatedPart, 'Stok hareketi kaydedildi.');
  } catch (err) {
    next(err);
  }
};
