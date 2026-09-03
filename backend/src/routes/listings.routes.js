const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const listingsController = require('../controllers/listings.controller');
const { authenticate, requireSubscription } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

router.use(authenticate, requireSubscription);

// Pazar yeri ilanları (tüm şirketlerin aktif ilanları)
router.get('/marketplace', listingsController.getMarketplace);

// Kendi ilanlarım
router.get('/my', listingsController.getMyListings);

router.get('/:id', listingsController.getListingById);

router.post('/', [
  body('title').notEmpty().trim().withMessage('İlan başlığı zorunludur.'),
  body('description').notEmpty().withMessage('Açıklama zorunludur.'),
  body('price').isFloat({ min: 0 }).withMessage('Geçerli bir fiyat girin.'),
  body('quantity').isInt({ min: 1 }).withMessage('Miktar en az 1 olmalı.'),
], validate, listingsController.createListing);

router.put('/:id', listingsController.updateListing);
router.delete('/:id', listingsController.deleteListing);

// İlan mesajları
router.get('/:id/messages', listingsController.getMessages);
router.post('/:id/messages', [
  body('message').notEmpty().withMessage('Mesaj boş olamaz.'),
], validate, listingsController.sendMessage);

module.exports = router;
