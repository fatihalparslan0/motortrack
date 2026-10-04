const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/workorder.controller');
const { authenticate, requireSubscription, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

router.use(authenticate, requireSubscription);

router.get('/', ctrl.getWorkOrders);
router.get('/stats', ctrl.getWorkOrderStats);
router.get('/plate-history', ctrl.getPlateHistory);
router.get('/receivables', authorize('ADMIN', 'MANAGER'), ctrl.getReceivables);
router.get('/:id', ctrl.getWorkOrderById);

router.post('/', [
  body('title').notEmpty().withMessage('İş emri başlığı zorunludur.'),
], validate, ctrl.createWorkOrder);

router.put('/:id', ctrl.updateWorkOrder);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), ctrl.deleteWorkOrder);

// Personel Atama & Yönetici Onay Yönetimi
router.patch('/:id/assign', authorize('ADMIN', 'MANAGER'), ctrl.assignWorkOrder);
router.patch('/:id/approve', authorize('ADMIN', 'MANAGER'), ctrl.approveWorkOrder);
router.post('/:id/claim', ctrl.claimWorkOrder);
router.post('/:id/takeover-request', ctrl.requestWorkOrderTakeover);
router.post('/:id/takeover-respond', authorize('ADMIN', 'MANAGER'), ctrl.respondWorkOrderTakeover);

// Ödeme ve Veresiye Yönetimi (Sadece Yönetici / Admin)
router.patch('/:id/payment', authorize('ADMIN', 'MANAGER'), ctrl.updateWorkOrderPayment);

// Parça & Ekspertiz Fotoğrafları
router.post('/:id/photos', ctrl.addWorkOrderPhoto);
router.delete('/:id/photos', ctrl.removeWorkOrderPhoto);

// İş emri parça yönetimi (Tekli ve Çoklu)
router.post('/:id/items', [
  body('partId').notEmpty().withMessage('Parça ID zorunludur.'),
  body('quantity').isInt({ min: 1 }).withMessage('Miktar en az 1 olmalı.'),
], validate, ctrl.addWorkOrderItem);

router.post('/:id/items/batch', [
  body('items').isArray({ min: 1 }).withMessage('En az bir parça seçilmelidir.'),
], validate, ctrl.addWorkOrderBatchItems);

router.patch('/:id/items/:itemId/status', [
  body('status').isIn(['REZERVE', 'KULLANILDI', 'IPTAL']).withMessage('Geçersiz durum.'),
], validate, ctrl.updateWorkOrderItemStatus);

router.delete('/:id/items/:itemId', ctrl.removeWorkOrderItem);

module.exports = router;
