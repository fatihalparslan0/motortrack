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

router.post('/', [
  body('name').notEmpty().withMessage('Depo adı zorunludur.'),
], validate, ctrl.createWarehouse);

router.put('/:id', authorize('ADMIN', 'MANAGER', 'TECHNICIAN'), ctrl.updateWarehouse);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), ctrl.deleteWarehouse);

module.exports = router;
