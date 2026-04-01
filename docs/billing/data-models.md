# Data Models

## Core Has No Billing Tables

All billing data (subscriptions, plans, usage reports, payment intents) lives in **revisium-payment**. Core's Prisma schema has no billing models.

Core fetches billing data via `BillingClient` — an HMAC-signed HTTP client that talks to the payment service REST API.

## What Core Queries Locally

`UsageService` counts current usage from core's own Prisma models:

| Metric | Query | Source |
|---|---|---|
| `row_versions` | TypedSQL: `countOrgRowVersions.sql` | Row → Table → Revision → Branch → Project → Organization |
| `projects` | `prisma.project.count()` | Project (non-deleted) |
| `seats` | `prisma.userOrganization.count()` | UserOrganization |
| `storage_bytes` | TODO (returns 0) | File plugin storage |
| `api_calls` | TODO (returns 0) | API request tracking |

## What Lives in Payment Service

See the revisium-payment repository `docs/billing.md` for:

- `Subscription` model (one per org, status lifecycle)
- `UsageReport` model (periodic snapshots from core)
- `PaymentIntent` / `PaymentAttempt` models
- `Notification` model
- `BillingStatus` / `BillingInterval` enums
