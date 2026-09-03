const jwt = require('jsonwebtoken');
const { error } = require('../utils/apiResponse');
const prisma = require('../utils/prisma');

/**
 * JWT doğrulama middleware
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Yetkilendirme token\'ı gerekli.', 401);
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        company: {
          include: { subscription: { include: { plan: true } } },
        },
      },
    });

    if (!user || !user.isActive) {
      return error(res, 'Kullanıcı bulunamadı veya hesap devre dışı.', 401);
    }

    req.user = user;
    req.company = user.company;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Token süresi dolmuş.', 401);
    }
    return error(res, 'Geçersiz token.', 401);
  }
};

/**
 * Rol bazlı yetkilendirme
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
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
