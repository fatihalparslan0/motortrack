const express = require('express');
const router = express.Router();
const companiesController = require('../controllers/companies.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/profile', companiesController.getProfile);
router.put('/profile', authorize('ADMIN'), companiesController.updateProfile);
router.get('/users', companiesController.getUsers);
router.post('/users', authorize('ADMIN'), companiesController.inviteUser);
router.put('/users/:id', authorize('ADMIN'), companiesController.updateUser);
router.delete('/users/:id', authorize('ADMIN'), companiesController.deactivateUser);

module.exports = router;
