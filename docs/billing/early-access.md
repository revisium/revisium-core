# Early Adopter Program

Lets users get Pro features for free during early access. When payments are ready, admin sets a transition date — users add a payment method or get downgraded.

## How It Works

### During Early Access

1. Pricing page shows real prices (Free $0, Pro $29/mo, Enterprise $99/mo)
2. Pro button says "Get Early Access" — user clicks it
3. Organization gets `status: early_adopter`, `planId: 'pro'`
4. Pro limits apply immediately — no payment required
5. `LimitsService` treats `early_adopter` the same as `active` — checks the subscribed plan's limits

### When Payments Are Ready

1. Admin sets `EARLY_ACCESS_TRANSITION_DATE=2026-06-01` and redeploys
2. On that date, the auto-downgrade cron runs at midnight:
   - Early adopters WITH `externalCustomerId` (payment method) → `status: active` (paying customer)
   - Early adopters WITHOUT payment → `status: free`, `planId: 'free'` (downgraded)

### No Per-User Expiration

Early access is global — all early adopters transition at the same time. There's no per-org expiration date. The admin controls when the transition happens via the env var.

## API

### Self-Serve Activation

```
POST /api/billing/:organizationId/early-access
Body: { "planId": "pro" }
Auth: JWT, org owner

→ Creates/updates subscription with status: early_adopter
```

GraphQL:

```graphql
mutation {
  activateEarlyAccess(data: { organizationId: "...", planId: "pro" }) {
    id
    status
    planId
  }
}
```

### List Plans

```
GET /api/billing/plans
Auth: none (public)

→ { plans: [...], earlyAccess: true }
```

GraphQL:

```graphql
query {
  plans {
    id
    name
    maxRowVersions
    maxProjects
    maxSeats
    monthlyPriceUsd
    yearlyPriceUsd
  }
}
```

### Organization Subscription & Usage

```
GET /api/billing/:organizationId/subscription
GET /api/billing/:organizationId/usage
Auth: JWT, org member
```

GraphQL (resolved on Organization):

```graphql
query {
  organization(organizationId: "...") {
    subscription {
      planId
      status
    }
    usage {
      rowVersions {
        current
        limit
        percentage
      }
      projects {
        current
        limit
        percentage
      }
      seats {
        current
        limit
        percentage
      }
    }
  }
}
```

### Admin API

```
POST /api/admin/billing/subscription
Body: { "organizationId": "...", "status": "active", "planId": "pro" }
Auth: JWT, system admin
```

## Billing Status Lifecycle

```
free ──► early_adopter ──► active ──► past_due ──► cancelled
              │                                        │
              └── free (downgraded, no payment) ◄──────┘
```

| Status          | Plan Limits                | Payment Required | When                     |
| --------------- | -------------------------- | ---------------- | ------------------------ |
| `free`          | Free plan                  | No               | Default for all new orgs |
| `early_adopter` | Subscribed plan (e.g. Pro) | No               | After "Get Early Access" |
| `active`        | Subscribed plan            | Yes              | After payment added      |
| `past_due`      | Subscribed plan (grace)    | Overdue          | Payment failed           |
| `cancelled`     | Free plan                  | No               | Subscription ended       |

## Auto-Downgrade Cron

Runs daily at midnight. Only acts when `EARLY_ACCESS_TRANSITION_DATE` is set and the date has passed.

```text
For each subscription with status = early_adopter:
  if externalCustomerId is set → activate (status: active)
  if externalCustomerId is null → downgrade (status: free, planId: free)
```

The cron is idempotent — running it again after all early adopters have been transitioned does nothing (no more `early_adopter` subscriptions to process).

## Environment Variables

| Variable                       | Default | Description                                                                                                                                                                      |
| ------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EARLY_ACCESS_ENABLED`         | `false` | Enable early access program. When `true`, users can activate Pro for free. When `false`, the activation endpoint returns 400 and the plans endpoint returns `earlyAccess: false` |
| `EARLY_ACCESS_TRANSITION_DATE` | not set | Date (YYYY-MM-DD) when early access ends. On this date, early adopters without payment are downgraded                                                                            |

## File Structure

```text
ee/billing/early-access/
  early-access.module.ts
  early-access.service.ts
  commands/
    activate-early-access.command.ts
    activate-early-access.handler.ts
    update-subscription-status.command.ts
    update-subscription-status.handler.ts
  crons/
    auto-downgrade.cron.ts
  rest/
    billing.controller.ts
    admin-billing.controller.ts
  graphql/
    billing.resolver.ts
    models/
      subscription.model.ts
      plan.model.ts
      usage.model.ts
    inputs/
      activate-early-access.input.ts
```
