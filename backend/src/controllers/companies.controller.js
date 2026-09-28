const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { success, error } = require('../utils/apiResponse');

exports.getProfile = async (req, res, next) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.company.id },
      include: {
        subscription: { include: { plan: true } },
        _count: { select: { users: true, motors: true, parts: true } },
      },
    });
    return success(res, company, 'Şirket profili');
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, address, city, taxNumber } = req.body;
    const company = await prisma.company.update({
      where: { id: req.company.id },
      data: { name, phone, address, city, taxNumber },
    });
    return success(res, company, 'Şirket profili güncellendi.');
  } catch (err) {
    next(err);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { companyId: req.company.id },
      select: {
        id: true, email: true, fullName: true,
        role: true, isActive: true, lastLoginAt: true,
        avatarUrl: true, createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return success(res, users, 'Kullanıcılar');
  } catch (err) {
    next(err);
  }
};

exports.inviteUser = async (req, res, next) => {
  try {
    const { email, fullName, role, password } = req.body;

    // Plan kullanıcı limiti
    const plan = req.company.subscription?.plan;
    if (plan?.maxUsers) {
      const count = await prisma.user.count({ where: { companyId: req.company.id, isActive: true } });
      if (count >= plan.maxUsers) {
        return error(res, `Planınız en fazla ${plan.maxUsers} kullanıcı destekler.`, 403);
      }
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return error(res, 'Bu e-posta zaten kullanımda.', 409);

    const passwordHash = await bcrypt.hash(password || 'ChangeMe123!', 12);
    const user = await prisma.user.create({
      data: {
        companyId: req.company.id,
        email, fullName, role: role || 'TECHNICIAN', passwordHash,
      },
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    });

    return success(res, user, 'Kullanıcı oluşturuldu.', 201);
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!user) return error(res, 'Kullanıcı bulunamadı.', 404);

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(req.body.fullName && { fullName: req.body.fullName }),
        ...(req.body.role && { role: req.body.role }),
        ...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
      },
      select: { id: true, email: true, fullName: true, role: true, isActive: true },
    });

    return success(res, updated, 'Kullanıcı güncellendi.');
  } catch (err) {
    next(err);
  }
};

exports.deactivateUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return error(res, 'Kendinizi devre dışı bırakamazsınız.', 400);
    }
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!user) return error(res, 'Kullanıcı bulunamadı.', 404);
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    return success(res, null, 'Kullanıcı devre dışı bırakıldı.');
  } catch (err) {
    next(err);
  }
};
