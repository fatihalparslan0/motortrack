const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

// Yönetici ve Müdür için Yönetim Raporu & Performans Sorgulama
router.get(
  '/executive-summary',
  authorize('ADMIN', 'MANAGER'),
  analyticsController.getExecutiveSummary
);

module.exports = router;
