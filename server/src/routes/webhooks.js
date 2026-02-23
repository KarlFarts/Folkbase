import express from 'express';
import { stripe } from '../stripe/client.js';
import { upsertSubscription, getSubscriptionByCustomerId } from '../models/subscription.js';

const router = express.Router();

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 *
 * Events:
 * - checkout.session.completed: User completed payment
 * - customer.subscription.updated: Subscription changed
 * - customer.subscription.deleted: Subscription canceled
 * - invoice.payment_failed: Payment failed
 */
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

/**
 * Handle checkout.session.completed
 * Activate subscription when payment succeeds
 */
async function handleCheckoutCompleted(session) {
  const customerId = session.customer;
  const subscription = await getSubscriptionByCustomerId(customerId);

  if (!subscription) {
    console.error('No subscription found for customer:', customerId);
    return;
  }

  // Get Stripe subscription details
  const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);

  await upsertSubscription(subscription.userId, {
    status: 'active',
    features: [
      'workspaces',
      'calendar_sync',
      'import_export',
      'duplicate_detection',
      'backup_restore',
      'braindump',
    ],
    workspaceSlots: 5, // TODO: Calculate from line items
    memberSlots: 10, // TODO: Calculate from line items
    currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
  });

  console.log('Subscription activated for user:', subscription.userId);
}

/**
 * Handle customer.subscription.updated
 * Update subscription when changed (e.g., quantity changed)
 */
async function handleSubscriptionUpdated(stripeSubscription) {
  const customerId = stripeSubscription.customer;
  const subscription = await getSubscriptionByCustomerId(customerId);

  if (!subscription) {
    console.error('No subscription found for customer:', customerId);
    return;
  }

  const status = stripeSubscription.status; // active, past_due, canceled, etc.

  await upsertSubscription(subscription.userId, {
    status,
    currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
  });

  console.log('Subscription updated for user:', subscription.userId, 'Status:', status);
}

/**
 * Handle customer.subscription.deleted
 * Downgrade to free tier when subscription canceled
 */
async function handleSubscriptionDeleted(stripeSubscription) {
  const customerId = stripeSubscription.customer;
  const subscription = await getSubscriptionByCustomerId(customerId);

  if (!subscription) {
    console.error('No subscription found for customer:', customerId);
    return;
  }

  await upsertSubscription(subscription.userId, {
    status: 'canceled',
    features: [],
    workspaceSlots: 0,
    memberSlots: 0,
    currentPeriodEnd: null,
  });

  console.log('Subscription canceled for user:', subscription.userId);
}

/**
 * Handle invoice.payment_failed
 * Mark subscription as past_due when payment fails
 */
async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;
  const subscription = await getSubscriptionByCustomerId(customerId);

  if (!subscription) {
    console.error('No subscription found for customer:', customerId);
    return;
  }

  await upsertSubscription(subscription.userId, {
    status: 'past_due',
  });

  console.log('Payment failed for user:', subscription.userId);
}

export default router;
