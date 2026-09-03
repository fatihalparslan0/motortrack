const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prisma = require('../utils/prisma');
const { success, error } = require('../utils/apiResponse');

exports.getPlans = async (req, res, next) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });
    return success(res, plans, 'Abonelik planları');
  } catch (err) {
    next(err);
  }
};

exports.getSubscriptionStatus = async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { companyId: req.company.id },
      include: { plan: true },
    });

    if (!subscription) {
      return success(res, { status: 'NONE', plan: null });
    }

    // Trial sona erdi mi?
    let status = subscription.status;
    if (status === 'TRIAL' && subscription.trialEndsAt && new Date() > subscription.trialEndsAt) {
      status = 'TRIAL_EXPIRED';
    }

    return success(res, {
      ...subscription,
      status,
      daysLeft: subscription.trialEndsAt
        ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)))
        : null,
    });
  } catch (err) {
    next(err);
  }
};

exports.createCheckoutSession = async (req, res, next) => {
  try {
    const { planId, interval = 'month' } = req.body;

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.stripePriceId) {
      return error(res, 'Plan bulunamadı veya Stripe yapılandırması eksik.', 404);
    }

    // Stripe müşteri oluştur/getir
    let subscription = await prisma.subscription.findUnique({
      where: { companyId: req.company.id },
    });

    let customerId = subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.company.email,
        name: req.company.name,
        metadata: { companyId: req.company.id },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/plans`,
      metadata: {
        companyId: req.company.id,
        planId: plan.id,
      },
      subscription_data: {
        metadata: { companyId: req.company.id, planId: plan.id },
      },
    });

    return success(res, { url: session.url, sessionId: session.id }, 'Ödeme sayfası hazır.');
  } catch (err) {
    next(err);
  }
};

exports.createPortalSession = async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { companyId: req.company.id },
    });

    if (!subscription?.stripeCustomerId) {
      return error(res, 'Aktif Stripe aboneliği bulunamadı.', 404);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/settings/subscription`,
    });

    return success(res, { url: session.url });
  } catch (err) {
    next(err);
  }
};

exports.cancelSubscription = async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { companyId: req.company.id },
    });

    if (!subscription?.stripeSubscriptionId) {
      return error(res, 'Aktif abonelik bulunamadı.', 404);
    }

    // Dönem sonunda iptal et
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await prisma.subscription.update({
      where: { companyId: req.company.id },
      data: { cancelAtPeriodEnd: true },
    });

    return success(res, null, 'Aboneliğiniz mevcut dönem sonunda iptal edilecek.');
  } catch (err) {
    next(err);
  }
};
