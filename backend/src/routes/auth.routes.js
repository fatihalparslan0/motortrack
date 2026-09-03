const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

// POST /api/auth/register — Şirket + admin kullanıcı kaydı
router.post('/register', [
  body('companyName').notEmpty().withMessage('Şirket adı zorunludur.'),
  body('email').isEmail().withMessage('Geçerli bir e-posta adresi girin.'),
  body('password').isLength({ min: 8 }).withMessage('Şifre en az 8 karakter olmalıdır.'),
  body('fullName').notEmpty().withMessage('Ad soyad zorunludur.'),
], validate, authController.register);

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().withMessage('Geçerli bir e-posta adresi girin.'),
  body('password').notEmpty().withMessage('Şifre zorunludur.'),
], validate, authController.login);

// POST /api/auth/refresh — Access token yenile
router.post('/refresh', authController.refreshToken);

// POST /api/auth/logout
router.post('/logout', authenticate, authController.logout);

// GET /api/auth/me — Aktif kullanıcı bilgisi
router.get('/me', authenticate, authController.getMe);

// PUT /api/auth/change-password
router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
], validate, authController.changePassword);

module.exports = router;
