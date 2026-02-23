/**
 * Billing API Client
 *
 * Communicates with the billing backend for subscription management.
 */

const BILLING_API_URL = import.meta.env.VITE_BILLING_API_URL;

/**
 * Fetch the current user's subscription
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<object>} Subscription object
 */
export async function fetchSubscription(accessToken) {
  // Skip if no billing backend is configured
  if (!BILLING_API_URL || BILLING_API_URL.includes('localhost')) {
    throw new Error('No billing backend configured');
  }

  const response = await fetch(`${BILLING_API_URL}/subscription`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch subscription: ${response.status}`);
  }

  return response.json();
}

/**
 * Create a Stripe Checkout session
 * @param {string} accessToken - Google OAuth access token
 * @param {string} priceId - Stripe Price ID
 * @param {number} quantity - Number of units to purchase
 * @returns {Promise<string>} Checkout URL
 */
export async function createCheckoutSession(accessToken, priceId, quantity = 1) {
  const successUrl = `${window.location.origin}/settings?checkout=success`;
  const cancelUrl = `${window.location.origin}/settings?checkout=cancel`;

  const response = await fetch(`${BILLING_API_URL}/checkout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      priceId,
      quantity,
      successUrl,
      cancelUrl,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create checkout session: ${response.status}`);
  }

  const data = await response.json();
  return data.checkoutUrl;
}

/**
 * Create a Stripe Customer Portal session
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<string>} Portal URL
 */
export async function createPortalSession(accessToken) {
  const returnUrl = `${window.location.origin}/settings`;

  const response = await fetch(`${BILLING_API_URL}/portal`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      returnUrl,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create portal session: ${response.status}`);
  }

  const data = await response.json();
  return data.portalUrl;
}
