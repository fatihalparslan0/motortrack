const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const partsController = require('../controllers/parts.controller');
const { authenticate, requireSubscription, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

router.use(authenticate, requireSubscription);

router.get('/', partsController.getParts);
router.get('/low-stock', partsController.getLowStockParts);
router.get('/stats', partsController.getPartsStats);
router.get('/:id', partsController.getPartById);
router.get('/:id/movements', partsController.getPartMovements);

router.post('/', authorize('ADMIN', 'MANAGER'), [
  body('name').notEmpty().withMessage('Parça adı zorunludur.'),
  body('quantity').isInt({ min: 0 }).withMessage('Miktar 0 veya daha fazla olmalı.'),
], validate, partsController.createPart);

router.put('/:id', authorize('ADMIN', 'MANAGER'), partsController.updatePart);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), partsController.deletePart);

// Manuel stok hareketi kaydet (Sadece Admin ve Manager)
router.post('/:id/movement', authorize('ADMIN', 'MANAGER'), [
  body('movementType').isIn(['IN','OUT','TRANSFER','ADJUSTMENT','RETURN']),
  body('quantity').isInt({ min: 1 }),
], validate, partsController.addMovement);

module.exports = router;
