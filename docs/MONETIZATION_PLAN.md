# Touchpoint CRM - Monetization Implementation Plan

## Context

Touchpoint is approaching shipping as a general-purpose contact management app (extended rolodex). Currently 100% free with a React frontend and Google Sheets as the database. This plan adds a full freemium monetization system: feature gating infrastructure, a lightweight backend for billing, and Stripe integration. The pricing model is usage-based (pay per workspace, per additional user) rather than fixed tiers.

## Product Decisions

- **Free tier**: Unlimited contacts with full basic contact management. No feature limits on core CRUD.
- **Premium (paid) features**:
  1. **Workspaces** - Creating/joining shared workspaces (shared Google Sheets)
  2. **Google Calendar sync** - Two-way calendar integration
  3. **Advanced data tools** - Import/export, duplicate detection/merging, backup/restore, braindump
- **Pricing model**: Usage-based. Pay per workspace created, pay per user added to a workspace. Exact prices TBD but the infrastructure should support flexible pricing.
- **No artificial contact limits** on any tier.

---

## Architecture Overview

```
Browser (React App)
  |
  |-- Feature Gate Check (SubscriptionContext)
  |       |
  |       |-- Reads user subscription from backend
  |       |-- Gates premium features with <PremiumGate> wrapper
  |       |-- Shows upgrade prompts for locked features
  |
  |-- Billing Backend (new, lightweight)
  |       |
  |       |-- Node.js/Express API (or serverless functions)
  |       |-- Stripe Checkout for payments
  |       |-- Stripe Webhooks for subscription events
  |       |-- User subscription state stored in Firestore/Supabase/simple DB
  |       |-- JWT validation (verify Google OAuth user identity)
  |
  |-- Stripe
          |-- Checkout Sessions
          |-- Customer Portal (manage subscriptions)
          |-- Webhooks (payment events)
```

---

## Implementation Tasks

### Task 1: Define Premium Feature Constants

**File**: `src/config/constants.js`

Add a `PREMIUM_FEATURES` constant that enumerates all gated features:

```javascript
export const PREMIUM_FEATURES = {
  WORKSPACES: 'workspaces',
  CALENDAR_SYNC: 'calendar_sync',
  IMPORT_EXPORT: 'import_export',
  DUPLICATE_DETECTION: 'duplicate_detection',
  BACKUP_RESTORE: 'backup_restore',
  BRAINDUMP: 'braindump',
};
```

Add a `SUBSCRIPTION_STATUS` constant:

```javascript
export const SUBSCRIPTION_STATUS = {
  FREE: 'free',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  TRIALING: 'trialing',
};
```

---

### Task 2: Create SubscriptionContext

**New file**: `src/contexts/SubscriptionContext.js`

This context manages the user's subscription state and provides feature-gating helpers. It sits in the provider hierarchy after AuthProvider (needs the user identity).

**Provider hierarchy update** in `src/App.js`:
```
AuthProvider
  └── NotificationProvider
      └── SubscriptionProvider  <-- NEW, goes here
          └── WorkspaceProvider
              └── AppContent
```

**Context API**:
```javascript
const {
  subscription,        // { status, features, workspaceSlots, memberSlots }
  loading,             // boolean - still fetching subscription
  hasFeature,          // (featureKey) => boolean
  canCreateWorkspace,  // () => boolean (has available workspace slots)
  canAddMember,        // (workspaceId) => boolean (has available member slots)
  openUpgrade,         // () => void - opens Stripe Checkout / upgrade modal
  openManage,          // () => void - opens Stripe Customer Portal
  refreshSubscription, // () => Promise - re-fetch subscription state
} = useSubscription();
```

**Implementation details**:
- On mount (when user is authenticated), fetch subscription state from the billing backend using the user's Google OAuth email/ID as the identifier.
- Cache subscription state in localStorage with a short TTL (5 minutes) so the app doesn't block on every page load.
- If the backend is unreachable, fall back to cached state or default to free tier (fail-open so the app still works).
- In dev mode (`VITE_DEV_MODE=true`), read subscription state from localStorage so developers can test premium features without a backend. Add a dev tools toggle for this.

**Dev mode mock subscription** (add to existing dev tools panel):
```javascript
// In dev mode, allow toggling premium status
localStorage.setItem('dev_subscription', JSON.stringify({
  status: 'active',
  features: ['workspaces', 'calendar_sync', 'import_export', 'duplicate_detection', 'backup_restore', 'braindump'],
  workspaceSlots: 5,
  memberSlots: 10,
}));
```

---

### Task 3: Create PremiumGate Component

**New file**: `src/components/PremiumGate.js`

A wrapper component that conditionally renders its children or an upgrade prompt.

**Usage**:
```jsx
<PremiumGate feature={PREMIUM_FEATURES.CALENDAR_SYNC}>
  <CalendarSyncButton />
</PremiumGate>
```

**Props**:
- `feature` (string, required) - The feature key from `PREMIUM_FEATURES`
- `fallback` (node, optional) - Custom fallback UI. Defaults to a styled upgrade prompt.
- `inline` (boolean, optional) - If true, renders a small inline lock icon + "Upgrade" link instead of a full card. Use for menu items and small UI elements.

**Default fallback UI**:
- Card with lock icon (from lucide-react)
- Feature name and short description
- "Upgrade to unlock" button that calls `openUpgrade()` from SubscriptionContext
- Uses existing `.card` CSS patterns and design tokens

**Also export a hook**:
```javascript
export function usePremiumFeature(featureKey) {
  const { hasFeature, openUpgrade } = useSubscription();
  return {
    isUnlocked: hasFeature(featureKey),
    requestUpgrade: openUpgrade,
  };
}
```

---

### Task 4: Gate Existing Premium Features

Apply `PremiumGate` wrappers and `usePremiumFeature` checks to the following locations:

#### 4a. Workspaces
- **`src/App.js`**: Wrap workspace-related routes (`/workspaces`, `/workspaces/create`, `/join`) with `PremiumGate` using `feature={PREMIUM_FEATURES.WORKSPACES}`
- **`src/contexts/WorkspaceContext.js`**: In the workspace creation flow, check `canCreateWorkspace()` before allowing creation
- **Navbar workspace switcher**: Show a lock icon and upgrade prompt if workspaces are not unlocked

#### 4b. Google Calendar Sync
- **Wherever the calendar sync toggle/button lives**: Wrap with `PremiumGate` using `feature={PREMIUM_FEATURES.CALENDAR_SYNC}`
- **`src/utils/syncEngine.js`**: Add a guard at the top of the sync function that checks subscription status before syncing. This is a safety net - the UI gates should prevent reaching this code, but defense in depth.

#### 4c. Import/Export
- **`src/App.js`**: Wrap the `/import` and `/export` routes with `PremiumGate` using `feature={PREMIUM_FEATURES.IMPORT_EXPORT}`
- **Navigation menu items for Import/Export**: Use the `inline` variant of PremiumGate to show a lock icon

#### 4d. Duplicate Detection
- **`src/App.js`**: Wrap the `/duplicates` route with `PremiumGate` using `feature={PREMIUM_FEATURES.DUPLICATE_DETECTION}`
- **Dashboard duplicate alerts**: Replace with an upgrade prompt if feature is locked

#### 4e. Backup/Restore
- **`src/App.js`**: Wrap the `/backup` route with `PremiumGate` using `feature={PREMIUM_FEATURES.BACKUP_RESTORE}`

#### 4f. Braindump
- **`src/App.js`**: Wrap the `/braindump` route with `PremiumGate` using `feature={PREMIUM_FEATURES.BRAINDUMP}`

---

### Task 5: Build Billing Backend

**New directory**: `server/` at project root (separate from the React app)

This is a lightweight Node.js/Express API that handles:
1. Subscription state lookups
2. Stripe Checkout session creation
3. Stripe webhook handling
4. Stripe Customer Portal session creation

#### 5a. Project Setup

```
server/
  package.json
  .env.example        # STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, DATABASE_URL
  src/
    index.js           # Express app entry point
    routes/
      subscription.js  # GET /api/subscription, POST /api/checkout, POST /api/portal
      webhooks.js      # POST /api/webhooks/stripe
    middleware/
      auth.js          # Validate Google OAuth token, extract user identity
    models/
      subscription.js  # Subscription data model
    stripe/
      client.js        # Stripe client setup
      products.js      # Stripe product/price definitions
```

#### 5b. API Endpoints

**`GET /api/subscription`**
- Auth: Google OAuth token in Authorization header
- Returns: `{ status, features, workspaceSlots, memberSlots, stripeCustomerId }`
- If no subscription record exists, returns free tier defaults

**`POST /api/checkout`**
- Auth: Google OAuth token
- Body: `{ priceId, quantity?, successUrl, cancelUrl }`
- Creates a Stripe Checkout Session
- Returns: `{ checkoutUrl }`

**`POST /api/portal`**
- Auth: Google OAuth token
- Creates a Stripe Customer Portal session
- Returns: `{ portalUrl }`

**`POST /api/webhooks/stripe`**
- No auth (Stripe signature verification instead)
- Handles events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- Updates subscription records accordingly

#### 5c. Auth Middleware

Validates the Google OAuth access token by calling Google's tokeninfo endpoint (same pattern as `AuthContext.js` line 36-60). Extracts the user's email as the unique identifier.

#### 5d. Database

Use a simple database for subscription records. Options (pick one during implementation):
- **Supabase** (free tier, PostgreSQL, easy setup)
- **Firebase Firestore** (free tier, already in Google ecosystem)
- **SQLite** (simplest, file-based, good for starting out)

Subscription record schema:
```
{
  userId: string,          // Google email
  stripeCustomerId: string,
  status: string,          // free | active | past_due | canceled | trialing
  features: string[],      // enabled feature keys
  workspaceSlots: number,  // how many workspaces they've paid for
  memberSlots: number,     // how many members per workspace
  currentPeriodEnd: date,  // subscription renewal date
  createdAt: date,
  updatedAt: date,
}
```

#### 5e. Stripe Products Setup

Create Stripe Products and Prices for:
1. **Workspace** - Per-unit price (each unit = 1 workspace)
2. **Additional Members** - Per-unit price (each unit = 1 member slot)

These can be recurring (monthly) or one-time. The infrastructure should support both. Use Stripe's metered billing or per-seat model.

---

### Task 6: Connect Frontend to Backend

**New file**: `src/utils/billingApi.js`

API client for the billing backend:

```javascript
const BILLING_API_URL = import.meta.env.VITE_BILLING_API_URL || 'http://localhost:3001/api';

export async function fetchSubscription(accessToken) { ... }
export async function createCheckoutSession(accessToken, priceId, quantity) { ... }
export async function createPortalSession(accessToken) { ... }
```

**New env variable**: `VITE_BILLING_API_URL` - URL of the billing backend

**Update `SubscriptionContext.js`**: Wire it to use `billingApi.js` for fetching subscription state and creating checkout/portal sessions.

---

### Task 7: Upgrade UI Components

**New file**: `src/components/UpgradePrompt.js`

A reusable upgrade prompt component used by PremiumGate's default fallback:

- Lock icon (lucide-react `Lock`)
- Feature name and benefit description
- "Upgrade" CTA button
- Styled using existing design tokens and `.card` pattern
- Clicking the button redirects to Stripe Checkout

**New file**: `src/pages/SettingsPanels/BillingPanel.js` (or integrate into existing Settings page)

A billing management panel in Settings:
- Current plan status
- List of active features
- Workspace/member usage (X of Y slots used)
- "Manage Subscription" button (opens Stripe Customer Portal)
- "Upgrade" button if on free tier
- Billing history link (via Stripe Portal)

---

### Task 8: Environment & Configuration

**Update `.env.example`** with new variables:
```bash
VITE_BILLING_API_URL=http://localhost:3001/api
```

**Create `server/.env.example`**:
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PORT=3001
DATABASE_URL=...
GOOGLE_TOKEN_INFO_URL=https://www.googleapis.com/oauth2/v1/tokeninfo
```

---

## Implementation Order

Execute tasks in this order (some can be parallelized):

1. **Task 1** (constants) - No dependencies
2. **Task 2** (SubscriptionContext) - Depends on Task 1
3. **Task 3** (PremiumGate component) - Depends on Task 2
4. **Task 4** (Gate existing features) - Depends on Task 3
5. **Task 5** (Billing backend) - Can be done in parallel with Tasks 2-4
6. **Task 6** (Connect frontend to backend) - Depends on Tasks 2 and 5
7. **Task 7** (Upgrade UI) - Depends on Tasks 3 and 6
8. **Task 8** (Environment config) - Do alongside Tasks 5-6

**Parallel tracks**:
- Track A: Tasks 1 -> 2 -> 3 -> 4 (frontend gating)
- Track B: Task 5 (backend)
- Merge: Tasks 6 -> 7 -> 8

---

## Verification

### Dev Mode Testing (no backend needed)
1. Run `npm start` with `VITE_DEV_MODE=true`
2. Open dev tools panel, toggle subscription to "free" - verify premium features show upgrade prompts
3. Toggle subscription to "active" - verify premium features unlock
4. Verify all gated routes (`/workspaces`, `/import`, `/export`, `/duplicates`, `/backup`, `/braindump`) show appropriate gates
5. Verify workspace creation checks slot limits

### Backend Testing
1. Start billing server: `cd server && npm start`
2. Test subscription lookup: `GET /api/subscription` with valid Google OAuth token
3. Test checkout flow: Create checkout session, complete in Stripe test mode, verify webhook updates subscription
4. Test portal: Create portal session, verify redirect works

### Integration Testing
1. Sign in with Google OAuth
2. On free tier: attempt each premium feature, verify upgrade prompt appears
3. Click "Upgrade", complete Stripe test checkout
4. After payment: verify features unlock without page refresh (subscription refresh)
5. Open Settings > Billing, verify plan details show correctly
6. Click "Manage Subscription", verify Stripe Portal opens

### Edge Cases
- Backend unreachable: App should still work, defaulting to free tier (or cached state)
- Subscription expired: Features should re-lock, show "renew" prompt
- Multiple browser tabs: Subscription state should be consistent via localStorage cache

---

## Key Files Reference

**Existing files to modify**:
- `src/config/constants.js` - Add premium feature constants
- `src/App.js` - Add SubscriptionProvider to hierarchy, wrap premium routes
- `src/contexts/WorkspaceContext.js` - Add workspace slot checks
- `.env.example` - Add billing API URL

**New files to create**:
- `src/contexts/SubscriptionContext.js`
- `src/components/PremiumGate.js`
- `src/components/UpgradePrompt.js`
- `src/utils/billingApi.js`
- `src/pages/SettingsPanels/BillingPanel.js` (or equivalent)
- `server/` directory (entire billing backend)
