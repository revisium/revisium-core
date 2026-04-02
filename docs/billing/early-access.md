# Early Adopter Program

Lets users get Pro features for free during early access. When payments are ready, admin uses payment service admin API to transition users.

## How It Works

### During Early Access

1. Pricing page shows real prices (Free $0, Pro $29/mo)
2. Pro button says "Get Early Access" — user clicks it
3. Core calls `BillingClient.activateEarlyAccess(orgId, "pro")` → payment service
4. Payment service creates subscription with `status: early_adopter`, `planId: 'pro'`
5. Pro limits apply immediately — no payment required

### When Payments Are Ready

Admin uses the **payment service admin API** (not core):

1. `POST /admin/early-access/start-transition` — sets transition date, optionally notifies users
2. `POST /admin/subscriptions/bulk-transition` — transition early_adopter → free (or active)
3. `GET /admin/early-access/status` — check progress

The auto-downgrade cron in core is a no-op stub — bulk transitions are handled by the payment service admin API.

## API

### Self-Serve Activation

```
POST /api/billing/:organizationId/early-access
Body: { "planId": "pro" }
Auth: JWT, org owner

→ Calls payment service, returns { status, planId }
```

GraphQL:

```graphql
mutation {
  activateEarlyAccess(data: { organizationId: "...", planId: "pro" }) {
    planId
    status
  }
}
```

### List Plans

```
GET /api/billing/plans
Auth: none (public)

→ Fetches from payment service via BillingClient.getPlans()
→ { plans: [...] }
```

### Organization Subscription & Usage

```
GET /api/billing/:organizationId/subscription
→ Fetches from payment service via BillingClient.getSubscription()

GET /api/billing/:organizationId/usage
→ Counts locally via UsageService, resolves limits from payment service
→ { rowVersions: { current, limit, percentage }, projects: {...}, ... }
```

## File Structure

```text
ee/billing/early-access/
  early-access.module.ts
  early-access.service.ts         # Uses BillingClient for all payment service calls
  crons/
    auto-downgrade.cron.ts        # Stub — transitions handled by payment service admin API
  rest/
    billing.controller.ts         # /api/billing/* endpoints
    admin-billing.controller.ts   # /api/admin/billing/* endpoints
  graphql/
    billing.resolver.ts           # plans, subscription, usage, activateEarlyAccess
    models/
      subscription.model.ts
      plan.model.ts
      usage.model.ts
    inputs/
      activate-early-access.input.ts
```
