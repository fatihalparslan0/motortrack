const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/stock.controller');
const { authenticate, requireSubscription, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

router.use(authenticate, requireSubscription);

// Stok girişi (satın alma) - Sadece Admin ve Manager
router.post('/purchase', authorize('ADMIN', 'MANAGER'), [
  body('partId').notEmpty().withMessage('Parça ID zorunludur.'),
  body('quantity').isInt({ min: 1 }).withMessage('Miktar en az 1 olmalı.'),
  body('unitCost').isFloat({ min: 0 }).withMessage('Alış fiyatı 0 veya daha fazla olmalı.'),
], validate, ctrl.purchaseStock);

// Manuel stok çıkışı (Sadece Admin ve Manager)
router.post('/out', authorize('ADMIN', 'MANAGER'), [
  body('partId').notEmpty().withMessage('Parça ID zorunludur.'),
  body('quantity').isInt({ min: 1 }).withMessage('Miktar en az 1 olmalı.'),
  body('reason').isIn(['FIRE', 'SATIS', 'DUZELTME', 'ATOLYE_SARFI', 'SARF', 'IADE', 'TEDARIKCIYE_IADE', 'OUT']).withMessage('Geçerli bir sebep seçin.'),
], validate, ctrl.stockOut);

// Atölye Hızlı Sarfiyat Toplu Çıkışı (Sadece Admin ve Manager)
router.post('/batch-consume', authorize('ADMIN', 'MANAGER'), [
  body('items').isArray({ min: 1 }).withMessage('En az bir sarf malzemesi girilmelidir.'),
], validate, ctrl.batchConsumeWorkshop);

// Depolar arası transfer (Sadece Admin ve Manager)
router.post('/transfer', authorize('ADMIN', 'MANAGER'), [
  body('partId').notEmpty().withMessage('Parça seçilmelidir.'),
  body('fromWarehouseId').notEmpty().withMessage('Kaynak depo zorunludur.'),
  body('toWarehouseId').notEmpty().withMessage('Hedef depo zorunludur.'),
  body('quantity').isInt({ min: 1 }).withMessage('Miktar en az 1 olmalı.'),
], validate, ctrl.transferStock);

// Depo stoklarını doğrudan düzenleme / sayım (Sadece Admin ve Manager)
router.post('/adjust-warehouses', authorize('ADMIN', 'MANAGER'), [
  body('partId').notEmpty().withMessage('Parça ID zorunludur.'),
  body('warehouseStocks').isArray().withMessage('Depo stok listesi zorunludur.'),
], validate, ctrl.adjustWarehouseStocks);

// Stok hareketleri listesi
router.get('/movements', ctrl.getMovements);

// Barkod / SKU ile ürün ara
router.get('/barcode/:barcode', ctrl.findByBarcode);

module.exports = router;
