const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/workorder.controller');
const { authenticate, requireSubscription } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

router.use(authenticate, requireSubscription);

router.get('/', ctrl.getWorkOrders);
router.get('/stats', ctrl.getWorkOrderStats);
router.get('/plate-history', ctrl.getPlateHistory);
router.get('/receivables', ctrl.getReceivables);
router.get('/:id', ctrl.getWorkOrderById);

router.post('/', [
  body('title').notEmpty().withMessage('İş emri başlığı zorunludur.'),
], validate, ctrl.createWorkOrder);

router.put('/:id', ctrl.updateWorkOrder);
router.delete('/:id', ctrl.deleteWorkOrder);

// Ödeme ve Veresiye Yönetimi
router.patch('/:id/payment', ctrl.updateWorkOrderPayment);

// Parça & Ekspertiz Fotoğrafları
router.post('/:id/photos', ctrl.addWorkOrderPhoto);
router.delete('/:id/photos', ctrl.removeWorkOrderPhoto);

// İş emri parça yönetimi
router.post('/:id/items', [
  body('partId').notEmpty().withMessage('Parça ID zorunludur.'),
  body('quantity').isInt({ min: 1 }).withMessage('Miktar en az 1 olmalı.'),
], validate, ctrl.addWorkOrderItem);

router.patch('/:id/items/:itemId/status', [
  body('status').isIn(['REZERVE', 'KULLANILDI', 'IPTAL']).withMessage('Geçersiz durum.'),
], validate, ctrl.updateWorkOrderItemStatus);

router.delete('/:id/items/:itemId', ctrl.removeWorkOrderItem);

module.exports = router;
