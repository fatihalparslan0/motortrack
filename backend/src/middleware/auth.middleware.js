const jwt = require('jsonwebtoken');
const { error } = require('../utils/apiResponse');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

/**
 * JWT doğrulama middleware
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      logger.warn(`[Auth 401] Yetkilendirme tokenı yok veya geçersiz başlık: ${req.method} ${req.originalUrl}`);
      return error(res, 'Yetkilendirme token\'ı gerekli.', 401);
    }
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        logger.warn(`[Auth 401] Access Token süresi dolmuş: ${req.method} ${req.originalUrl}`);
        return error(res, 'Token süresi dolmuş.', 401);
      }
      logger.warn(`[Auth 401] Geçersiz token (${err.message}): ${req.method} ${req.originalUrl}`);
      return error(res, 'Geçersiz token.', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        company: {
          include: { subscription: { include: { plan: true } } },
        },
      },
    });

    if (!user || !user.isActive) {
      logger.warn(`[Auth 401] Kullanıcı bulunamadı veya pasif: ${decoded.userId} on ${req.method} ${req.originalUrl}`);
      return error(res, 'Kullanıcı bulunamadı veya hesap devre dışı.', 401);
    }

    req.user = user;
    req.company = user.company;
    next();
  } catch (err) {
    logger.error(`[Auth Error] ${err.message}`);
    next(err);
  }
};

/**
 * Rol bazlı yetkilendirme
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role) && req.user.role !== 'SUPER_ADMIN') {
      return error(res, 'Bu işlem için yetkiniz yok.', 403);
    }
    next();
  };
};

/**
 * Abonelik kontrolü middleware
 * TODO: Stripe entegrasyonu tamamlandığında aktif et
 */
const requireSubscription = (req, res, next) => {
  // Geliştirme aşamasında abonelik kontrolü devre dışı
  // Stripe/iyzico entegrasyonu sonrası aktif edilecek
  next();
};

module.exports = { authenticate, authorize, requireSubscription };
