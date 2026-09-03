const { v4: uuidv4 } = require('uuid');
const prisma = require('../utils/prisma');
const { success, error, paginated } = require('../utils/apiResponse');

/**
 * GET /api/motors
 */
exports.getMotors = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, motorType, location } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      companyId: req.company.id,
      ...(search && {
        OR: [
          { serialNumber: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status }),
      ...(motorType && { motorType }),
      ...(location && { location: { contains: location, mode: 'insensitive' } }),
    };

    const [motors, total] = await Promise.all([
      prisma.motor.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { parts: true, maintenanceRecords: true } },
        },
      }),
      prisma.motor.count({ where }),
    ]);

    return paginated(res, motors, total, page, limit, 'Motorlar listelendi.');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/motors/stats
 */
exports.getMotorStats = async (req, res, next) => {
  try {
    const companyId = req.company.id;

    const [totalMotors, activeMotors, maintenanceMotors, retiredMotors] = await Promise.all([
      prisma.motor.count({ where: { companyId } }),
      prisma.motor.count({ where: { companyId, status: 'ACTIVE' } }),
      prisma.motor.count({ where: { companyId, status: 'MAINTENANCE' } }),
      prisma.motor.count({ where: { companyId, status: 'RETIRED' } }),
    ]);

    // Yaklaşan bakımlar (7 gün içinde)
    const upcomingMaintenance = await prisma.maintenanceRecord.count({
      where: {
        motor: { companyId },
        status: 'PLANNED',
        nextMaintenanceDate: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          gte: new Date(),
        },
      },
    });

    return success(res, {
      totalMotors,
      activeMotors,
      maintenanceMotors,
      retiredMotors,
      upcomingMaintenance,
    }, 'Motor istatistikleri');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/motors/:id
 */
exports.getMotorById = async (req, res, next) => {
  try {
    const motor = await prisma.motor.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
      include: {
        parts: { orderBy: { createdAt: 'desc' } },
        maintenanceRecords: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { user: { select: { fullName: true } } },
        },
        _count: { select: { parts: true, maintenanceRecords: true } },
      },
    });

    if (!motor) return error(res, 'Motor bulunamadı.', 404);
    return success(res, motor, 'Motor detayı');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/motors
 */
exports.createMotor = async (req, res, next) => {
  try {
    const { serialNumber, brand, model, motorType, manufactureYear,
      purchaseDate, status, location, notes } = req.body;

    // Plan limiti kontrolü
    const plan = req.company.subscription?.plan;
    if (plan?.maxMotors) {
      const count = await prisma.motor.count({ where: { companyId: req.company.id } });
      if (count >= plan.maxMotors) {
        return error(res, `Planınız en fazla ${plan.maxMotors} motor destekler. Planınızı yükseltin.`, 403);
      }
    }

    const motor = await prisma.motor.create({
      data: {
        companyId: req.company.id,
        serialNumber,
        brand,
        model,
        motorType: motorType || 'AUTOMOTIVE',
        manufactureYear: manufactureYear ? parseInt(manufactureYear) : null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        status: status || 'ACTIVE',
        location,
        notes,
        qrCode: uuidv4(),
      },
    });

    return success(res, motor, 'Motor başarıyla oluşturuldu.', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/motors/:id
 */
exports.updateMotor = async (req, res, next) => {
  try {
    const existing = await prisma.motor.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!existing) return error(res, 'Motor bulunamadı.', 404);

    const { serialNumber, brand, model, motorType, manufactureYear,
      purchaseDate, status, location, notes, imageUrl } = req.body;

    const motor = await prisma.motor.update({
      where: { id: req.params.id },
      data: {
        ...(serialNumber && { serialNumber }),
        ...(brand && { brand }),
        ...(model && { model }),
        ...(motorType && { motorType }),
        ...(manufactureYear && { manufactureYear: parseInt(manufactureYear) }),
        ...(purchaseDate && { purchaseDate: new Date(purchaseDate) }),
        ...(status && { status }),
        ...(location !== undefined && { location }),
        ...(notes !== undefined && { notes }),
        ...(imageUrl && { imageUrl }),
      },
    });

    return success(res, motor, 'Motor güncellendi.');
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/motors/:id
 */
exports.deleteMotor = async (req, res, next) => {
  try {
    const existing = await prisma.motor.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!existing) return error(res, 'Motor bulunamadı.', 404);

    await prisma.motor.delete({ where: { id: req.params.id } });
    return success(res, null, 'Motor silindi.');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/motors/:id/parts
 */
exports.getMotorParts = async (req, res, next) => {
  try {
    const motor = await prisma.motor.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!motor) return error(res, 'Motor bulunamadı.', 404);

    const parts = await prisma.part.findMany({
      where: { motorId: req.params.id },
      orderBy: { name: 'asc' },
    });

    return success(res, parts, 'Motor parçaları');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/motors/:id/maintenance
 */
exports.getMotorMaintenance = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const motor = await prisma.motor.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!motor) return error(res, 'Motor bulunamadı.', 404);

    const [records, total] = await Promise.all([
      prisma.maintenanceRecord.findMany({
        where: { motorId: req.params.id },
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { performedAt: 'desc' },
        include: { user: { select: { fullName: true, avatarUrl: true } } },
      }),
      prisma.maintenanceRecord.count({ where: { motorId: req.params.id } }),
    ]);

    return paginated(res, records, total, page, limit, 'Bakım kayıtları');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/motors/scan-qr
 */
exports.scanQrCode = async (req, res, next) => {
  try {
    const { qrCode } = req.body;
    const motor = await prisma.motor.findFirst({
      where: { qrCode, companyId: req.company.id },
      include: { _count: { select: { parts: true } } },
    });

    if (!motor) return error(res, 'QR koda ait motor bulunamadı.', 404);
    return success(res, motor, 'Motor bulundu.');
  } catch (err) {
    next(err);
  }
};
