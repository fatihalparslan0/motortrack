const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/supplier.controller');
const { authenticate, requireSubscription } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

router.use(authenticate, requireSubscription);

router.get('/', ctrl.getSuppliers);
router.get('/:id', ctrl.getSupplierById);

router.post('/', [
  body('name').notEmpty().withMessage('Tedarikçi adı zorunludur.'),
], validate, ctrl.createSupplier);

router.put('/:id', ctrl.updateSupplier);
router.delete('/:id', ctrl.deleteSupplier);

module.exports = router;
