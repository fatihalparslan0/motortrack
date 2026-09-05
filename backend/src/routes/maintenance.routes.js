const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const maintenanceController = require('../controllers/maintenance.controller');
const { authenticate, requireSubscription } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

router.use(authenticate, requireSubscription);

router.get('/', maintenanceController.getMaintenanceRecords);
router.get('/upcoming', maintenanceController.getUpcomingMaintenance);
router.get('/:id', maintenanceController.getMaintenanceById);

router.post('/', [
  body('motorId').optional({ nullable: true, checkFalsy: true }),
  body('title').notEmpty().withMessage('Başlık zorunludur.'),
  body('maintenanceType').isIn(['PREVENTIVE','CORRECTIVE','INSPECTION','EMERGENCY','OTHER']),
], validate, maintenanceController.createMaintenance);

router.put('/:id', maintenanceController.updateMaintenance);
router.delete('/:id', maintenanceController.deleteMaintenance);

module.exports = router;
