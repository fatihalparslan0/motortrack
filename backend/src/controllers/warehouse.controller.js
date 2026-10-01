const prisma = require('../utils/prisma');
const { success, error, paginated } = require('../utils/apiResponse');

// ─── Depo Listesi ─────────────────────────────────────────────────────────────
exports.getWarehouses = async (req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      where: { companyId: req.company.id, isActive: true },
      include: {
        _count: { select: { stocks: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    return success(res, warehouses, 'Depolar listelendi.');
  } catch (err) {
    next(err);
  }
};

// ─── Depo Oluştur ─────────────────────────────────────────────────────────────
exports.createWarehouse = async (req, res, next) => {
  try {
    const { name, address, description, isDefault } = req.body;

    // Eğer varsayılan yapılıyorsa diğerlerini güncelle
    if (isDefault) {
      await prisma.warehouse.updateMany({
        where: { companyId: req.company.id },
        data: { isDefault: false },
      });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        companyId: req.company.id,
        name,
        address: address || null,
        description: description || null,
        isDefault: isDefault || false,
      },
    });

    return success(res, warehouse, 'Depo oluşturuldu.', 201);
  } catch (err) {
    next(err);
  }
};

// ─── Depo Güncelle ────────────────────────────────────────────────────────────
exports.updateWarehouse = async (req, res, next) => {
  try {
    const existing = await prisma.warehouse.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!existing) return error(res, 'Depo bulunamadı.', 404);

    const { name, address, description, isDefault, isActive } = req.body;

    if (isDefault) {
      await prisma.warehouse.updateMany({
        where: { companyId: req.company.id, id: { not: req.params.id } },
        data: { isDefault: false },
      });
    }

    const warehouse = await prisma.warehouse.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(description !== undefined && { description }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return success(res, warehouse, 'Depo güncellendi.');
  } catch (err) {
    next(err);
  }
};

// ─── Depo İstatistikleri ──────────────────────────────────────────────────────
exports.getWarehouseStats = async (req, res, next) => {
  try {
    const companyId = req.company.id;

    const [totalParts, criticalStockCount, recentMovements, warehouses] = await Promise.all([
      prisma.part.count({ where: { companyId, isActive: true } }),
      prisma.$queryRaw`
        SELECT COUNT(*) as count FROM parts
        WHERE "companyId" = ${companyId} 
          AND quantity <= "minQuantity" 
          AND "minQuantity" > 0
          AND "isActive" = true
      `,
      prisma.partMovement.findMany({
        where: { part: { companyId } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          part: { select: { name: true, unit: true } },
          user: { select: { fullName: true } },
        },
      }),
      prisma.warehouse.count({ where: { companyId, isActive: true } }),
    ]);

    const totalStockQty = await prisma.part.aggregate({
      where: { companyId, isActive: true },
      _sum: { quantity: true },
    });

    return success(res, {
      totalParts,
      totalStockQuantity: totalStockQty._sum.quantity || 0,
      criticalStockCount: parseInt(criticalStockCount[0]?.count || 0),
      totalWarehouses: warehouses,
      recentMovements,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Kritik Stok Listesi ──────────────────────────────────────────────────────
exports.getCriticalStock = async (req, res, next) => {
  try {
    const companyId = req.company.id;
    const parts = await prisma.part.findMany({
      where: {
        companyId,
        isActive: true,
        minQuantity: { gt: 0 },
      },
      include: {
        warehouseStocks: { include: { warehouse: { select: { name: true } } } },
      },
      orderBy: { quantity: 'asc' },
    });

    // JS tarafında filtrele (Prisma'nın field referansı sorunu nedeniyle)
    const criticalParts = parts.filter(p => p.quantity <= p.minQuantity);
    const isTech = req.user.role === 'TECHNICIAN';
    const sanitized = isTech
      ? criticalParts.map(p => ({ ...p, purchasePrice: null }))
      : criticalParts;

    return success(res, sanitized, 'Kritik stok ürünleri');
  } catch (err) {
    next(err);
  }
};

// ─── Depo Sil ────────────────────────────────────────────────────────────────
exports.deleteWarehouse = async (req, res, next) => {
  try {
    const warehouse = await prisma.warehouse.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
      include: { stocks: true },
    });

    if (!warehouse) return error(res, 'Depo bulunamadı.', 404);

    if (warehouse.isDefault) {
      return error(res, 'Ana depo silinemez. Lütfen önce başka bir depoyu ana depo olarak belirleyin.', 400);
    }

    const hasStock = warehouse.stocks.some((s) => s.quantity > 0);
    if (hasStock) {
      return error(
        res,
        'Bu depoda mevcut stok bulunmaktadır. Silmeden önce stokları başka bir depoya transfer ediniz.',
        400
      );
    }

    await prisma.warehouse.delete({ where: { id: req.params.id } });
    return success(res, null, 'Depo başarıyla silindi.');
  } catch (err) {
    next(err);
  }
};
