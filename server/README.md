# Folkbase Billing Server

Lightweight Node.js/Express backend for handling Stripe billing and subscription management.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your Stripe keys
```

3. Create Stripe products:
   - Go to Stripe Dashboard > Products
   - Create two products:
     - "Workspace Slot" (recurring monthly, e.g., $10/month)
     - "Additional Member" (recurring monthly, e.g., $5/month)
   - Copy the Price IDs and add them to `.env`:
     ```
     STRIPE_WORKSPACE_PRICE_ID=price_xxxxx
     STRIPE_MEMBER_PRICE_ID=price_xxxxx
     ```

4. Set up Stripe webhooks:
   - Go to Stripe Dashboard > Developers > Webhooks
   - Add endpoint: `http://your-domain.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Copy webhook signing secret to `.env` as `STRIPE_WEBHOOK_SECRET`

5. Start the server:
```bash
npm start        # Production
npm run dev      # Development (with nodemon)
```

## API Endpoints

### `GET /api/subscription`
Get current user's subscription status.

**Headers:**
- `Authorization: Bearer {google_oauth_token}`

**Response:**
```json
{
  "status": "active",
  "features": ["workspaces", "calendar_sync", ...],
  "workspaceSlots": 5,
  "memberSlots": 10,
  "stripeCustomerId": "cus_xxxxx",
  "currentPeriodEnd": "2024-12-31T23:59:59Z"
}
```

### `POST /api/checkout`
Create Stripe Checkout session.

**Headers:**
- `Authorization: Bearer {google_oauth_token}`

**Body:**
```json
{
  "priceId": "price_xxxxx",
  "quantity": 1,
  "successUrl": "http://localhost:3000/success",
  "cancelUrl": "http://localhost:3000/cancel"
}
```

**Response:**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

### `POST /api/portal`
Create Stripe Customer Portal session.

**Headers:**
- `Authorization: Bearer {google_oauth_token}`

**Body:**
```json
{
  "returnUrl": "http://localhost:3000/settings"
}
```

**Response:**
```json
{
  "portalUrl": "https://billing.stripe.com/..."
}
```

### `POST /api/webhooks/stripe`
Stripe webhook handler (called by Stripe, not the frontend).

## Database

Currently uses in-memory storage for simplicity. For production, replace `src/models/subscription.js` with a real database:

- **SQLite**: Lightweight, file-based
- **PostgreSQL**: Full-featured relational DB
- **Firestore**: Firebase NoSQL database
- **Supabase**: Open-source Firebase alternative

## Security Notes

- **Never commit `.env` file** - contains secret keys
- **Use HTTPS in production** - required for Stripe webhooks
- **Validate all input** - auth middleware checks Google OAuth tokens
- **Rate limiting** - consider adding rate limiting middleware for production
