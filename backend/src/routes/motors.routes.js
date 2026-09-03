const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const motorController = require('../controllers/motors.controller');
const { authenticate, authorize, requireSubscription } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

router.use(authenticate, requireSubscription);

// GET /api/motors — Motor listesi
router.get('/', motorController.getMotors);

// GET /api/motors/stats — İstatistikler
router.get('/stats', motorController.getMotorStats);

// GET /api/motors/:id — Motor detayı
router.get('/:id', motorController.getMotorById);

// POST /api/motors — Motor oluştur
router.post('/', [
  body('serialNumber').notEmpty().withMessage('Seri numarası zorunludur.'),
  body('brand').notEmpty().withMessage('Marka zorunludur.'),
  body('model').notEmpty().withMessage('Model zorunludur.'),
  body('motorType').optional().isIn(['AUTOMOTIVE','INDUSTRIAL','MOTORCYCLE','MARINE','AGRICULTURAL','OTHER']),
], validate, motorController.createMotor);

// PUT /api/motors/:id — Motor güncelle
router.put('/:id', motorController.updateMotor);

// DELETE /api/motors/:id — Motor sil
router.delete('/:id', authorize('ADMIN', 'MANAGER'), motorController.deleteMotor);

// GET /api/motors/:id/parts — Motora bağlı parçalar
router.get('/:id/parts', motorController.getMotorParts);

// GET /api/motors/:id/maintenance — Bakım kayıtları
router.get('/:id/maintenance', motorController.getMotorMaintenance);

// POST /api/motors/scan-qr — QR kod ile motor bul
router.post('/scan-qr', motorController.scanQrCode);

module.exports = router;
