const prisma = require('../utils/prisma');
const { success, error, paginated } = require('../utils/apiResponse');

exports.getMaintenanceRecords = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, motorId, status, maintenanceType } = req.query;

    const where = {
      user: { companyId: req.company.id },
      ...(motorId && { motorId }),
      ...(status && { status }),
      ...(maintenanceType && { maintenanceType }),
    };

    const [records, total] = await Promise.all([
      prisma.maintenanceRecord.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { performedAt: 'desc' },
        include: {
          motor: { select: { id: true, brand: true, model: true, serialNumber: true } },
          user: { select: { fullName: true, avatarUrl: true } },
        },
      }),
      prisma.maintenanceRecord.count({ where }),
    ]);

    return paginated(res, records, total, page, limit, 'Bakım kayıtları listelendi.');
  } catch (err) {
    next(err);
  }
};

exports.getUpcomingMaintenance = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const records = await prisma.maintenanceRecord.findMany({
      where: {
        user: { companyId: req.company.id },
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
        nextMaintenanceDate: {
          lte: endDate,
        },
      },
      orderBy: { nextMaintenanceDate: 'asc' },
      include: {
        motor: { select: { id: true, brand: true, model: true, serialNumber: true, location: true } },
        user: { select: { fullName: true } },
      },
    });

    return success(res, records, `Önümüzdeki ${days} günde planlanan bakımlar`);
  } catch (err) {
    next(err);
  }
};

exports.getMaintenanceById = async (req, res, next) => {
  try {
    const record = await prisma.maintenanceRecord.findFirst({
      where: {
        id: req.params.id,
        user: { companyId: req.company.id },
      },
      include: {
        motor: true,
        user: { select: { fullName: true, avatarUrl: true } },
      },
    });

    if (!record) return error(res, 'Bakım kaydı bulunamadı.', 404);
    return success(res, record);
  } catch (err) {
    next(err);
  }
};

exports.createMaintenance = async (req, res, next) => {
  try {
    const { motorId, title, description, maintenanceType, cost,
      customerInfo, vehicleInfo,
      performedAt, nextMaintenanceDate, status, imageUrls } = req.body;

    let motor = null;
    if (motorId) {
      motor = await prisma.motor.findFirst({
        where: { id: motorId, companyId: req.company.id },
      });
      if (!motor) return error(res, 'Motor bulunamadı.', 404);
    }

    const record = await prisma.maintenanceRecord.create({
      data: {
        ...(motorId ? { motorId } : {}),
        userId: req.user.id,
        title,
        description,
        maintenanceType,
        cost: cost ? parseFloat(cost) : null,
        customerInfo,
        vehicleInfo,
        performedAt: performedAt ? new Date(performedAt) : new Date(),
        nextMaintenanceDate: nextMaintenanceDate ? new Date(nextMaintenanceDate) : null,
        status: status || 'COMPLETED',
        imageUrls: imageUrls || [],
      },
      include: {
        motor: { select: { id: true, brand: true, model: true } },
        user: { select: { fullName: true } },
      },
    });

    // Motoru bakım durumuna al
    if (status === 'IN_PROGRESS' && motorId) {
      await prisma.motor.update({
        where: { id: motorId },
        data: { status: 'MAINTENANCE' },
      });
    }

    return success(res, record, 'Bakım kaydı oluşturuldu.', 201);
  } catch (err) {
    next(err);
  }
};

exports.updateMaintenance = async (req, res, next) => {
  try {
    const existing = await prisma.maintenanceRecord.findFirst({
      where: { id: req.params.id, user: { companyId: req.company.id } },
    });
    if (!existing) return error(res, 'Bakım kaydı bulunamadı.', 404);

    const record = await prisma.maintenanceRecord.update({
      where: { id: req.params.id },
      data: {
        ...(req.body.title && { title: req.body.title }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        ...(req.body.cost !== undefined && { cost: req.body.cost ? parseFloat(req.body.cost) : null }),
        ...(req.body.customerInfo !== undefined && { customerInfo: req.body.customerInfo }),
        ...(req.body.vehicleInfo !== undefined && { vehicleInfo: req.body.vehicleInfo }),
        ...(req.body.status && { status: req.body.status }),
        ...(req.body.maintenanceType && { maintenanceType: req.body.maintenanceType }),
        ...(req.body.performedAt !== undefined && { performedAt: req.body.performedAt ? new Date(req.body.performedAt) : null }),
        ...(req.body.nextMaintenanceDate !== undefined && { nextMaintenanceDate: req.body.nextMaintenanceDate ? new Date(req.body.nextMaintenanceDate) : null }),
        ...(req.body.imageUrls && { imageUrls: req.body.imageUrls }),
      },
    });

    // Bakım tamamlandıysa motoru aktife al
    if (req.body.status === 'COMPLETED' && existing.motorId) {
      await prisma.motor.update({
        where: { id: existing.motorId },
        data: { status: 'ACTIVE' },
      });
    }

    return success(res, record, 'Bakım kaydı güncellendi.');
  } catch (err) {
    next(err);
  }
};

exports.deleteMaintenance = async (req, res, next) => {
  try {
    const existing = await prisma.maintenanceRecord.findFirst({
      where: { id: req.params.id, user: { companyId: req.company.id } },
    });
    if (!existing) return error(res, 'Bakım kaydı bulunamadı.', 404);
    await prisma.maintenanceRecord.delete({ where: { id: req.params.id } });
    return success(res, null, 'Bakım kaydı silindi.');
  } catch (err) {
    next(err);
  }
};
