# Subscription Lifecycle

Subscriptions are managed by **revisium-payment**. Core is a read-only consumer — it fetches subscription info via `BillingClient` but never creates or updates subscriptions directly.

## Status Flow

```
                    ┌──────────────────────────────────┐
                    │                                  │
                    ▼                                  │
 (no subscription) ──► free ──► active ──► cancelled   │
                        │         │                    │
                        │         ▼                    │
                        │      past_due ───────────────┘
                        │         │         (payment recovered)
                        │         ▼
                        │      cancelled
                        │
                        ▼
                   early_adopter ──► active
                                     (converts at end of early adopter period)
```

## Statuses

| Status | Description | Limits Enforced |
|---|---|---|
| `free` | Default. No payment method. | Yes (free plan limits) |
| `early_adopter` | Beta user with special terms | Yes (assigned plan) |
| `active` | Paying customer | Yes (subscribed plan) |
| `past_due` | Payment failed, grace period | Yes (subscribed plan) |
| `cancelled` | Subscription ended | Yes (free plan fallback) |

## When There Is No Subscription

If the payment service returns no subscription for an org, `LimitsService` fails open — all operations are allowed. This covers:

- **Self-hosted deployments** — billing module isn't loaded
- **Cloud orgs created before billing** — grandfathered in
- **Test/internal orgs** — no subscription needed

## How Status Changes Reach Core

1. Payment service processes a webhook (Stripe, CloudPayments, etc.)
2. Payment service updates the Subscription record
3. Payment service sends HMAC-signed callback to `POST /billing/payment-callback` on core
4. Core's `BillingCallbackController` receives the callback and invalidates the limits cache
5. Next `checkLimit()` call fetches fresh limits from payment service

## Who Manages Subscriptions

| Operation | Where It Happens |
|---|---|
| Create subscription (early access) | Payment service: `POST /orgs/:orgId/early-access` |
| Activate via checkout | Payment service: `POST /checkout` → webhook |
| Cancel subscription | Payment service: `POST /cancel` |
| Admin override | Payment service: `PATCH /admin/subscriptions/:orgId` |
| Bulk transition | Payment service: `POST /admin/subscriptions/bulk-transition` |
