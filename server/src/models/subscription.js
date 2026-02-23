/**
 * Subscription Data Model
 *
 * Simple in-memory storage for subscriptions.
 * TODO: Replace with actual database (SQLite, PostgreSQL, etc.) for production.
 */

// In-memory storage (replace with actual DB)
const subscriptions = new Map();

const FREE_TIER = {
  status: 'free',
  features: [],
  workspaceSlots: 0,
  memberSlots: 0,
  stripeCustomerId: null,
  currentPeriodEnd: null,
};

/**
 * Get subscription by user ID (email)
 */
export async function getSubscription(userId) {
  const subscription = subscriptions.get(userId);
  if (!subscription) {
    return { ...FREE_TIER, userId };
  }
  return subscription;
}

/**
 * Create or update subscription
 */
export async function upsertSubscription(userId, data) {
  const existing = subscriptions.get(userId) || { ...FREE_TIER, userId };

  const updated = {
    ...existing,
    ...data,
    userId,
    updatedAt: new Date().toISOString(),
  };

  if (!existing.createdAt) {
    updated.createdAt = updated.updatedAt;
  }

  subscriptions.set(userId, updated);
  return updated;
}

/**
 * Get subscription by Stripe customer ID
 */
export async function getSubscriptionByCustomerId(customerId) {
  for (const [_userId, subscription] of subscriptions.entries()) {
    if (subscription.stripeCustomerId === customerId) {
      return subscription;
    }
  }
  return null;
}

/**
 * Delete subscription (for testing)
 */
export async function deleteSubscription(userId) {
  subscriptions.delete(userId);
}
