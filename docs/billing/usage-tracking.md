# Usage Tracking

How usage is counted locally and reported to the payment service.

## Two Purposes

| Purpose | Method | Where |
|---|---|---|
| **Limit enforcement** | Real-time local query (cached 2 min) | Core: `UsageService.computeUsage()` |
| **Usage reporting** | Hourly cron reports to payment service | Core: `UsageReporterService` → Payment: `POST /orgs/:orgId/usage/report` |

## Real-Time Usage Counting

`UsageService.computeUsage()` returns the **current absolute total** for a metric from core's local Prisma database.

### Metrics

| Metric | Query | What It Returns |
|---|---|---|
| `row_versions` | TypedSQL: `countOrgRowVersions.sql` | Total unique row versions across all revisions |
| `projects` | `prisma.project.count()` | Total non-deleted projects |
| `seats` | `prisma.userOrganization.count()` | Total user memberships |
| `storage_bytes` | TODO (returns 0) | Total file storage consumed |
| `api_calls` | TODO (returns 0) | API calls today |

### Row-Version Counting

The most complex query. Counts unique `Row.versionId` values through the full entity hierarchy:

```sql
Row → Table (M2M) → Revision (M2M) → Branch → Project → Organization
```

Copy-on-write: unchanged rows share `versionId` across revisions — counted once.

Implementation: TypedSQL in `prisma/sql/countOrgRowVersions.sql`.

## Caching

Usage values are cached by `BillingCacheService` (2-min TTL) and invalidated via domain events when data changes. See [Cache Architecture](./cache.md).

## Hourly Usage Reporting

`UsageReporterService` runs `@Cron(EVERY_HOUR)`:

1. Fetches all organizations from local DB
2. For each org, computes `row_versions`, `projects`, `seats`, and `storage_bytes` locally via `UsageService`
3. Reports to payment service via `BillingClient.reportUsage(orgId, usage)`
4. Best-effort — failures are logged and skipped

The payment service stores these reports in its `UsageReport` table for billing analytics and admin dashboards.

## File Structure

```text
ee/billing/
  usage/
    usage.service.ts            # Local Prisma queries for usage counting
  usage-reporter.service.ts     # Hourly cron → payment service
  cache/
    billing-cache.service.ts    # Caching wrapper with tags
    billing-cache-invalidation.handler.ts  # Event-driven cache invalidation
```
