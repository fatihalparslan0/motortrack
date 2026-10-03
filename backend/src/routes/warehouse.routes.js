const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/warehouse.controller');
const { authenticate, requireSubscription, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

router.use(authenticate, requireSubscription);

router.get('/', ctrl.getWarehouses);
router.get('/stats', ctrl.getWarehouseStats);
router.get('/critical-stock', ctrl.getCriticalStock);
router.get('/:id', ctrl.getWarehouseDetail);

router.post('/', authorize('ADMIN', 'MANAGER'), [
  body('name').notEmpty().withMessage('Depo adı zorunludur.'),
], validate, ctrl.createWarehouse);

router.patch('/stock-shelf', [
  body('warehouseId').notEmpty().withMessage('Depo ID zorunludur.'),
  body('partId').notEmpty().withMessage('Parça ID zorunludur.'),
], validate, ctrl.updateStockShelfLocation);

router.put('/:id', authorize('ADMIN', 'MANAGER'), ctrl.updateWarehouse);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), ctrl.deleteWarehouse);

module.exports = router;

