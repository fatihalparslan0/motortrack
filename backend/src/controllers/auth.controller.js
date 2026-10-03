const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../utils/prisma');
const { success, error } = require('../utils/apiResponse');
const logger = require('../utils/logger');

const generateTokens = (userId, companyId, role) => {
  const accessToken = jwt.sign(
    { userId, companyId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, companyId, role, jti: uuidv4() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * POST /api/auth/register
 * Yeni şirket ve admin kullanıcı kaydı
 */
exports.register = async (req, res, next) => {
  try {
    const { companyName, email, password, fullName, phone, taxNumber } = req.body;

    // E-posta kontrolü
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return error(res, 'Bu e-posta adresi zaten kullanılıyor.', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Starter plan bul
    const starterPlan = await prisma.subscriptionPlan.findFirst({
      where: { name: 'Starter', isActive: true },
    });

    // Transaction: Şirket + kullanıcı + abonelik
    const result = await prisma.$transaction(async (tx) => {
      // Şirket oluştur
      const company = await tx.company.create({
        data: {
          name: companyName,
          email,
          phone,
          taxNumber,
        },
      });

      // Admin kullanıcı oluştur
      const user = await tx.user.create({
        data: {
          companyId: company.id,
          email,
          passwordHash: hashedPassword,
          fullName,
          role: 'ADMIN',
        },
      });

      // Trial abonelik oluştur
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + parseInt(process.env.TRIAL_DAYS || 14));

      if (starterPlan) {
        await tx.subscription.create({
          data: {
            companyId: company.id,
            planId: starterPlan.id,
            status: 'TRIAL',
            trialEndsAt,
          },
        });
      }

      return { company, user };
    });

    const { accessToken, refreshToken } = generateTokens(
      result.user.id, result.company.id, result.user.role
    );

    // Refresh token kaydet
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: { userId: result.user.id, token: refreshToken, expiresAt },
    });

    logger.info(`Yeni kayıt: ${email} - Şirket: ${companyName}`);

    return success(res, {
      accessToken,
      refreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
        companyId: result.company.id,
        companyName: result.company.name,
      },
    }, 'Kayıt başarılı! 14 günlük deneme süreniz başladı.', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        company: { include: { subscription: { include: { plan: true } } } },
      },
    });

    if (!user || !user.isActive) {
      return error(res, 'E-posta veya şifre hatalı.', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return error(res, 'E-posta veya şifre hatalı.', 401);
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.companyId, user.role);

    // Refresh token kaydet
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt },
    });

    // Son giriş güncelle
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return success(res, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company.name,
        subscription: user.company.subscription,
      },
    }, 'Giriş başarılı.');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/refresh
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return error(res, 'Refresh token gerekli.', 400);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || new Date() > storedToken.expiresAt) {
      return error(res, 'Geçersiz veya süresi dolmuş refresh token.', 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (jwtErr) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
      return error(res, 'Geçersiz veya süresi dolmuş refresh token.', 401);
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      decoded.userId, decoded.companyId, decoded.role
    );

    // Eski token'ı sil, yenisini kaydet (deleteMany P2025 hatası fırlatmaz)
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await prisma.refreshToken.create({
      data: { userId: decoded.userId, token: newRefreshToken, expiresAt },
    });

    return success(res, { accessToken, refreshToken: newRefreshToken }, 'Token yenilendi.');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 */
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    return success(res, null, 'Çıkış başarılı.');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 */
exports.getMe = async (req, res) => {
  const { passwordHash, ...userWithoutPassword } = req.user;
  return success(res, userWithoutPassword);
};

/**
 * PUT /api/auth/change-password
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) return error(res, 'Mevcut şifre hatalı.', 400);

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    return success(res, null, 'Şifre başarıyla güncellendi.');
  } catch (err) {
    next(err);
  }
};
