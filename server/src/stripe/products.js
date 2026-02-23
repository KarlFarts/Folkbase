/**
 * Stripe Product and Price Configuration
 *
 * This file defines the products and prices for Touchpoint CRM.
 * You'll need to create these products in your Stripe Dashboard and add the price IDs here.
 *
 * Usage-based pricing model:
 * - Per workspace slot (recurring monthly)
 * - Per additional member (recurring monthly)
 */

export const PRODUCTS = {
  WORKSPACE_SLOT: {
    name: 'Workspace Slot',
    description: 'Additional shared workspace',
    // TODO: Replace with actual Stripe Price ID from your dashboard
    priceId: process.env.STRIPE_WORKSPACE_PRICE_ID || 'price_xxxxxxxxxxxxx',
    unitAmount: 1000, // $10.00 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
    },
  },
  MEMBER_SLOT: {
    name: 'Additional Member',
    description: 'Additional workspace member',
    // TODO: Replace with actual Stripe Price ID from your dashboard
    priceId: process.env.STRIPE_MEMBER_PRICE_ID || 'price_xxxxxxxxxxxxx',
    unitAmount: 500, // $5.00 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
    },
  },
};

/**
 * Helper to get price ID by product key
 */
export function getPriceId(productKey) {
  const product = PRODUCTS[productKey];
  if (!product) {
    throw new Error(`Unknown product: ${productKey}`);
  }
  return product.priceId;
}
