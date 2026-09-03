require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Routes
const authRoutes = require('./routes/auth.routes');
const motorRoutes = require('./routes/motors.routes');
const partRoutes = require('./routes/parts.routes');
const listingRoutes = require('./routes/listings.routes');
const maintenanceRoutes = require('./routes/maintenance.routes');
const subscriptionRoutes = require('./routes/subscriptions.routes');
const companyRoutes = require('./routes/companies.routes');
const webhookRoutes = require('./routes/webhooks.routes');

const { errorHandler } = require('./middleware/error.middleware');
const logger = require('./utils/logger');

const app = express();

// ─── Stripe Webhook (raw body gerekli) ───────────────────────────────────────
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Çok fazla giriş denemesi, lütfen 15 dakika bekleyin.' },
});

app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/motors', motorRoutes);
app.use('/api/parts', partRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/companies', companyRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    service: 'MotorTrack API',
  });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Kaynak bulunamadı.' });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`🚀 MotorTrack API çalışıyor → http://localhost:${PORT}`);
  logger.info(`📋 Ortam: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
