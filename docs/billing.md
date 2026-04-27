# Billing & Limits

Plan limits and usage tracking for Revisium Cloud. Enterprise feature — self-hosted deployments have no limits.

## Quick Start

- Self-hosted: nothing to configure, everything is unlimited
- Cloud: set `PAYMENT_SERVICE_URL` + `PAYMENT_SERVICE_SECRET`
- `REVISIUM_LICENSE_KEY` is only needed for licensed `/ee/` enterprise features; it does not enable billing by itself

## Architecture

Core is an **ultra-thin client** — zero billing Prisma models. All billing state (subscriptions, plans, payment intents) lives in the **revisium-payment** service. Core only:

1. **Fetches limits** from the payment service via HMAC-signed HTTP
2. **Counts usage locally** (row versions, projects, seats) via Prisma
3. **Compares** projected usage vs limits
4. **Reports usage** hourly to the payment service

```
┌─────────────────────────────────────────────────────────────┐
│  Core (Apache 2.0)                                          │
│                                                             │
│  ILimitsService ──► NoopLimitsService (always allows)       │
│  BillingModule (@Global)                                    │
│  LimitExceededException (HTTP 403)                          │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ DI override (always loaded, active when PAYMENT_SERVICE_URL set)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  /ee/billing/ (proprietary) — ultra-thin client             │
│                                                             │
│  BillingClient ──── HMAC HTTP ────► revisium-payment        │
│       │                              (plans, subscriptions, │
│       │                               limits, checkout)     │
│  LimitsService (cached proxy, fail-open)                    │
│       │                                                     │
│  UsageService ── local Prisma queries (row versions,        │
│       │          projects, seats, storage)                   │
│       │                                                     │
│  BillingCacheService ── event-driven invalidation           │
│                         (7 handlers)                        │
│                                                             │
│  CallbackController ── receives payment-callback from       │
│                        payment service, invalidates cache   │
│                                                             │
│  UsageReporterService ── hourly cron, reports usage         │
│                          to payment service                 │
└─────────────────────────────────────────────────────────────┘
```

## How Limit Checks Work

```text
Request → Handler → checkLimit() → Limits cache hit? → Compare → Allow/Deny
                         ↓ cache miss
                    BillingClient.getOrgLimits() (HMAC HTTP → payment service)
                         ↓
                    Cache result (in-memory Map, 5-min TTL)
                         ↓
                    UsageService.computeUsage() (local Prisma, cached 2 min)
```

Fail-open: if payment service is unreachable and cache is cold, operations are allowed.

## Key Concepts

- **Absolute limits** (`row_versions`, `projects`, `seats`, `storage_bytes`) — total count across the org, never resets
- **Rate limits** (`api_calls`) — resets per time window (daily)
- **Resource-level limits** (`rows_per_table`, `tables_per_revision`, `branches_per_project`) — scoped to a specific entity (table, project), checked with context parameter
- **No billing tables in core** — plans, subscriptions, payment intents all live in revisium-payment

## Contents

- [Enforcement](./billing/enforcement.md) — which operations are checked, when, and how
- [Plans & Limits](./billing/plans.md) — plan definitions, metrics
- [Cache Architecture](./billing/cache.md) — caching strategy, invalidation, multi-pod behavior
- [Usage Counting](./billing/usage-tracking.md) — row-version counting, hourly reporting
- [Early Adopter Program](./billing/early-access.md) — free Pro features, transition to paid
- [Developer Guide](./billing/developer-guide.md) — adding metrics, testing

## Environment Variables

| Variable                   | Default | Description                                       |
| -------------------------- | ------- | ------------------------------------------------- |
| `PAYMENT_SERVICE_URL`      | —       | Payment service base URL (e.g. `http://payment:8082`). Billing is enabled when this is set |
| `PAYMENT_SERVICE_SECRET`   | —       | Shared HMAC secret for service-to-service auth. Should be set whenever `PAYMENT_SERVICE_URL` is set |
| `REVISIUM_LICENSE_KEY`     | —       | Required only for licensed `/ee/` enterprise features |
