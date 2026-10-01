const express = require('express');
const router = express.Router();
const cashController = require('../controllers/cash.controller');
const { authenticate, requireSubscription, authorize } = require('../middleware/auth.middleware');

router.use(authenticate, requireSubscription, authorize('ADMIN', 'MANAGER'));

// Günlük kasa durumu ve hareket zaman tüneli
router.get('/daily', cashController.getDailyRegister);

// Manuel kasa hareketi ekle (masraf, devir, harçlık vb.)
router.post('/transactions', cashController.addCashTransaction);

// Manuel kasa hareketi sil
router.delete('/transactions/:id', cashController.deleteCashTransaction);

// Gün sonu kasa kapatma (Z-Raporu alma)
router.post('/close-day', cashController.closeDay);
router.post('/close', cashController.closeDay);

// Geçmiş Z-Raporları
router.get('/reports', cashController.getZReports);

module.exports = router;
