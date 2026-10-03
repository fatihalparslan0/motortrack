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
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            workOrders: true,
            maintenanceRecords: true,
            partMovements: true,
            cashTransactions: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'asc' },
      ],
    });
    return success(res, users, 'Kullanıcılar listelendi.');
  } catch (err) {
    next(err);
  }
};

exports.inviteUser = async (req, res, next) => {
  try {
    const { email, fullName, role, password } = req.body;

    if (!req.company || !req.company.id) {
      return error(res, 'Yetkilendirme hatası: Şirket bilgisi bulunamadı.', 401);
    }

    if (!email || !fullName) {
      return error(res, 'E-posta ve ad soyad alanları zorunludur.', 400);
    }

    const validRoles = ['ADMIN', 'MANAGER', 'TECHNICIAN'];
    const assignedRole = role && validRoles.includes(role) ? role : 'TECHNICIAN';

    // Plan kullanıcı limiti kontrolü
    const plan = req.company.subscription?.plan;
    if (plan?.maxUsers) {
      const count = await prisma.user.count({ where: { companyId: req.company.id, isActive: true } });
      if (count >= plan.maxUsers) {
        return error(res, `Planınız en fazla ${plan.maxUsers} kullanıcı destekler.`, 403);
      }
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) return error(res, 'Bu e-posta adresi zaten başka bir hesapta kullanımda.', 409);

    const initialPassword = password || 'MotorTrack2024!';
    if (initialPassword.length < 6) {
      return error(res, 'Şifre en az 6 karakter olmalıdır.', 400);
    }

    const passwordHash = await bcrypt.hash(initialPassword, 12);
    const user = await prisma.user.create({
      data: {
        companyId: req.company.id,
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        role: assignedRole,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return success(res, user, 'Yeni kullanıcı başarıyla oluşturuldu.', 201);
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fullName, role, isActive, password, newPassword } = req.body;

    const user = await prisma.user.findFirst({
      where: { id, companyId: req.company.id },
    });
    if (!user) return error(res, 'Kullanıcı bulunamadı.', 404);

    const updateData = {};

    if (fullName && fullName.trim()) {
      updateData.fullName = fullName.trim();
    }

    if (role) {
      const validRoles = ['ADMIN', 'MANAGER', 'TECHNICIAN'];
      if (!validRoles.includes(role)) {
        return error(res, 'Geçersiz rol belirtildi.', 400);
      }

      // Kendi rolünü düşürmeye çalışıyorsa kontrol et
      if (id === req.user.id && role !== req.user.role) {
        const otherAdmins = await prisma.user.count({
          where: {
            companyId: req.company.id,
            role: 'ADMIN',
            isActive: true,
            id: { not: req.user.id },
          },
        });
        if (otherAdmins === 0) {
          return error(res, 'Şirkette en az bir aktif Yönetici bulunmalıdır. Kendi yetkinizi düşüremezsiniz.', 400);
        }
      }

      updateData.role = role;
    }

    if (isActive !== undefined) {
      if (id === req.user.id && !isActive) {
        return error(res, 'Kendi hesabınızı devre dışı bırakamazsınız.', 400);
      }
      updateData.isActive = Boolean(isActive);
    }

    const targetPass = password || newPassword;
    if (targetPass) {
      if (targetPass.length < 6) {
        return error(res, 'Şifre en az 6 karakter olmalıdır.', 400);
      }
      updateData.passwordHash = await bcrypt.hash(targetPass, 12);
      // Şifre güncellendiğinde açık oturumları kapat
      await prisma.refreshToken.deleteMany({ where: { userId: id } });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return success(res, updated, 'Kullanıcı bilgileri güncellendi.');
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return error(res, 'Yeni şifre en az 6 karakter olmalıdır.', 400);
    }

    const user = await prisma.user.findFirst({
      where: { id, companyId: req.company.id },
    });
    if (!user) return error(res, 'Kullanıcı bulunamadı.', 404);

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    // Oturumları kapat
    await prisma.refreshToken.deleteMany({ where: { userId: id } });

    return success(res, { id, email: user.email }, 'Kullanıcı şifresi başarıyla sıfırlandı.');
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return error(res, 'Kendi hesabınızı silemezsiniz.', 400);
    }

    const user = await prisma.user.findFirst({
      where: { id, companyId: req.company.id },
      include: {
        _count: {
          select: {
            workOrders: true,
            maintenanceRecords: true,
            partMovements: true,
            cashTransactions: true,
          },
        },
      },
    });

    if (!user) return error(res, 'Kullanıcı bulunamadı.', 404);

    const hasRelations = (
      user._count.workOrders > 0 ||
      user._count.maintenanceRecords > 0 ||
      user._count.partMovements > 0 ||
      user._count.cashTransactions > 0
    );

    if (hasRelations) {
      // İlişkili kayıtlar olduğu için veri bütünlüğünü korumak adına hesabı pasife al
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
      await prisma.refreshToken.deleteMany({ where: { userId: id } });
      return success(
        res,
        { id, action: 'deactivated', isSoft: true },
        'Kullanıcı geçmiş operasyonel kayıtlara bağlı olduğu için veri bütünlüğü adına pasif duruma getirildi.'
      );
    }

    await prisma.refreshToken.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });
    return success(res, { id, action: 'deleted', isSoft: false }, 'Kullanıcı başarıyla silindi.');
  } catch (err) {
    next(err);
  }
};

exports.deactivateUser = exports.deleteUser;

