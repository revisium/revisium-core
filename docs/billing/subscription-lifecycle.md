# Subscription Lifecycle

How subscriptions are created, updated, and transitioned between states.

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

| Status          | Description                  | Limits Enforced          | Snapshots |
| --------------- | ---------------------------- | ------------------------ | --------- |
| `free`          | Default. No payment method.  | Yes (free plan limits)   | No        |
| `early_adopter` | Beta user with special terms | Yes (assigned plan)      | Yes       |
| `active`        | Paying customer              | Yes (subscribed plan)    | Yes       |
| `past_due`      | Payment failed, grace period | Yes (subscribed plan)    | No        |
| `cancelled`     | Subscription ended           | Yes (free plan fallback) | No        |

## When Is a Subscription Created

A `Subscription` record is created when:

1. **Cloud signup** — when an organization is created on cloud.revisium.io, a subscription with `status: free` and `planId: 'free'` is created
2. **Early adopter activation** — admin manually creates a subscription with `status: early_adopter` and an assigned plan
3. **Self-serve checkout** — user completes payment flow (future: payment-providers spec)

## When There Is No Subscription

If an organization has no `Subscription` record, all limits are bypassed (`{ allowed: true }`). This is by design:

- **Self-hosted deployments** never have subscriptions — billing module isn't loaded
- **Cloud orgs created before billing** — grandfathered in until subscription is backfilled
- **Test/internal orgs** — no need to create subscription records

## Payment Provider Fields

| Field                    | Description                                                                 |
| ------------------------ | --------------------------------------------------------------------------- |
| `provider`               | Which payment system: `"stripe"`, `"cloudpayments"`, `"btcpay"`, `"manual"` |
| `externalCustomerId`     | The customer ID in the payment provider's system                            |
| `externalSubscriptionId` | The subscription ID in the payment provider's system                        |

These fields are set when a payment provider is connected. They're used by the payment webhook handlers (separate spec: payment-providers-v1) to reconcile external events with internal state.

## Billing Period

| Field                | Description                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `currentPeriodStart` | When the current billing cycle began                                                         |
| `currentPeriodEnd`   | When the current billing cycle ends                                                          |
| `interval`           | `monthly` or `yearly`                                                                        |
| `cancelAt`           | Scheduled cancellation date (user requested cancel, subscription continues until period end) |

## Status Transitions

### free → active

Triggered by: user completes checkout and payment succeeds.

### free → early_adopter

Triggered by: admin activates early adopter program for the org.

### early_adopter → active

Triggered by: early adopter period ends, user converts to paid plan.

### active → past_due

Triggered by: payment provider webhook reports failed payment.

### past_due → active

Triggered by: payment provider webhook reports successful retry.

### past_due → cancelled / active → cancelled

Triggered by: user cancels, or payment retries exhausted.

### cancelled → active

Triggered by: user resubscribes.

## What Happens on Status Change

Status changes are typically triggered by payment provider webhooks (not implemented in this PR). The subscription record is updated via CQRS commands:

- `UpdateSubscriptionStatusCommand` — changes status, updates period dates
- `CreateSubscriptionCommand` — creates new subscription for an org

These commands will also invalidate the billing cache (`billingCache.invalidateOrgBilling(orgId)`) to ensure the next limit check reads fresh data.
