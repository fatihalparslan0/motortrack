const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(err.message, { stack: err.stack, url: req.url, method: req.method });

  // Prisma hataları
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Bu kayıt zaten mevcut. Benzersiz alanları kontrol edin.',
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Kayıt bulunamadı.',
    });
  }

  // JWT hataları
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Geçersiz token.' });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Sunucu hatası oluştu.'
    : err.message || 'Sunucu hatası oluştu.';

  res.status(statusCode).json({ success: false, message });
};

module.exports = { errorHandler };
