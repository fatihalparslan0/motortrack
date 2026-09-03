const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.error(`Stripe webhook doğrulama hatası: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      // Checkout tamamlandı → abonelik oluştur
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { companyId, planId } = session.metadata;

        await prisma.subscription.upsert({
          where: { companyId },
          update: {
            planId,
            stripeSubscriptionId: session.subscription,
            stripeCustomerId: session.customer,
            status: 'ACTIVE',
          },
          create: {
            companyId,
            planId,
            stripeSubscriptionId: session.subscription,
            stripeCustomerId: session.customer,
            status: 'ACTIVE',
          },
        });

        logger.info(`Yeni abonelik: Şirket ${companyId}, Plan ${planId}`);
        break;
      }

      // Abonelik yenilendi
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: invoice.subscription },
            data: {
              status: 'ACTIVE',
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
          });
        }
        break;
      }

      // Ödeme başarısız
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: invoice.subscription },
            data: { status: 'PAST_DUE' },
          });
          logger.warn(`Ödeme başarısız: Abonelik ${invoice.subscription}`);
        }
        break;
      }

      // Abonelik iptal edildi
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: 'CANCELED' },
        });
        logger.info(`Abonelik iptal: ${subscription.id}`);
        break;
      }

      // Abonelik güncellendi (plan değişikliği)
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const planMetadata = subscription.metadata;

        if (planMetadata?.planId) {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: {
              planId: planMetadata.planId,
              status: subscription.status.toUpperCase(),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
          });
        }
        break;
      }

      default:
        logger.debug(`İşlenmeyen webhook eventi: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    logger.error(`Webhook işleme hatası: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: 'Webhook işleme hatası' });
  }
});

module.exports = router;
