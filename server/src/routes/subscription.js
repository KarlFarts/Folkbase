import express from 'express';
import { stripe } from '../stripe/client.js';
import { getSubscription, upsertSubscription } from '../models/subscription.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/subscription
 * Get the current user's subscription status
 */
router.get('/subscription', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.user;

    const subscription = await getSubscription(userId);

    res.json(subscription);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/**
 * POST /api/checkout
 * Create a Stripe Checkout session for purchasing workspaces/members
 *
 * Body:
 * - priceId: Stripe price ID
 * - quantity: Number of units (workspaces or members)
 * - successUrl: URL to redirect on success
 * - cancelUrl: URL to redirect on cancel
 */
router.post('/checkout', authenticateUser, async (req, res) => {
  try {
    const { userId, email } = req.user;
    const { priceId, quantity = 1, successUrl, cancelUrl } = req.body;

    if (!priceId || !successUrl || !cancelUrl) {
      return res.status(400).json({
        error: 'Missing required fields: priceId, successUrl, cancelUrl',
      });
    }

    // Get or create Stripe customer
    const subscription = await getSubscription(userId);
    let customerId = subscription.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          userId,
        },
      });
      customerId = customer.id;

      // Save customer ID
      await upsertSubscription(userId, { stripeCustomerId: customerId });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
      },
    });

    res.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/portal
 * Create a Stripe Customer Portal session for managing subscriptions
 *
 * Body:
 * - returnUrl: URL to return to after portal session
 */
router.post('/portal', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.user;
    const { returnUrl } = req.body;

    if (!returnUrl) {
      return res.status(400).json({ error: 'Missing returnUrl' });
    }

    const subscription = await getSubscription(userId);

    if (!subscription.stripeCustomerId) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    res.json({ portalUrl: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

export default router;
