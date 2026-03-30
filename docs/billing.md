# Billing & Limits

Plan limits and usage tracking for Revisium Cloud. Enterprise feature — self-hosted deployments have no limits.

## Quick Start

- Self-hosted: nothing to configure, everything is unlimited
- Cloud: set `REVISIUM_BILLING_ENABLED=true` + `REVISIUM_LICENSE_KEY` to enable billing

## Key Concepts

- **Absolute limits** (`row_versions`, `projects`, `seats`, `storage_bytes`) — total count across the org, never resets. An org on the Free plan can have up to 10,000 row versions total, not per day.
- **Rate limits** (`api_calls`) — resets per time window (daily). An org on the Free plan can make up to 1,000 API calls per day.
- **Daily snapshots** — historical records of absolute values for billing/analytics. Not used for enforcement.

## How It Works

Every mutation that creates or modifies data checks the organization's plan limits before executing. The check is fast (cached reads, sub-millisecond) and fails open — if anything is misconfigured, the operation is allowed.

```
Request → Handler → checkLimit() → Cache hit? → Allow/Deny
                         ↓ cache miss
                    Subscription lookup (DB, cached 5 min)
                         ↓
                    Plan resolution (in-memory)
                         ↓
                    Usage computation (DB, cached 2 min)
```

## Contents

- [Enforcement](./billing/enforcement.md) — which operations are checked, when, and how
- [Plans & Limits](./billing/plans.md) — plan definitions, metrics, how to add new plans
- [Cache Architecture](./billing/cache.md) — caching strategy, invalidation, multi-pod behavior
- [Data Models](./billing/data-models.md) — Subscription, UsageRecord, Prisma schema
- [Usage Tracking](./billing/usage-tracking.md) — row-version counting, daily snapshots, TypedSQL
- [Subscription Lifecycle](./billing/subscription-lifecycle.md) — status transitions, payment providers
- [Developer Guide](./billing/developer-guide.md) — adding metrics, extending plans, testing

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Core (Apache 2.0)                                          │
│                                                             │
│  ILimitsService ──► NoopLimitsService (always allows)       │
│  BillingModule (@Global)                                    │
│  LimitExceededException (HTTP 403)                          │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ DI override when REVISIUM_BILLING_ENABLED=true
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  /ee/billing/ (proprietary)                                 │
│                                                             │
│  LimitsService ── BillingCacheService ── UsageService       │
│       │                  │                    │             │
│       │            event-driven          TypedSQL queries   │
│       │            invalidation          (row versions,     │
│       │            (7 handlers)           projects, seats)  │
│       │                                                     │
│  HardcodedPlanProvider                                      │
│  UsageTrackingService (daily cron)                          │
└─────────────────────────────────────────────────────────────┘
```

## Environment Variables

| Variable                   | Default | Description                            |
| -------------------------- | ------- | -------------------------------------- |
| `REVISIUM_BILLING_ENABLED` | `false` | Load the billing module                |
| `REVISIUM_STANDALONE`      | `false` | Self-hosted mode — bypasses all limits |
| `REVISIUM_LICENSE_KEY`     | —       | Required for any enterprise features   |
