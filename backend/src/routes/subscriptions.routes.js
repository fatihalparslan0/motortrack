const express = require('express');
const router = express.Router();
const subscriptionsController = require('../controllers/subscriptions.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

// Planları listele (herkese açık)
router.get('/plans', subscriptionsController.getPlans);

// Şirketin abonelik durumu
router.get('/status', subscriptionsController.getSubscriptionStatus);

// Stripe checkout session oluştur
router.post('/checkout', subscriptionsController.createCheckoutSession);

// Abonelik portal (fatura, plan değişikliği)
router.post('/portal', subscriptionsController.createPortalSession);

// Aboneliği iptal et
router.post('/cancel', subscriptionsController.cancelSubscription);

module.exports = router;
