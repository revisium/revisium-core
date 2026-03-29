# Usage Tracking

How usage is counted for limit enforcement and recorded for historical reporting.

## Two Purposes, One System

| Purpose                  | Method                         | Data Source                               | Used By                      |
| ------------------------ | ------------------------------ | ----------------------------------------- | ---------------------------- |
| **Limit enforcement**    | Real-time query (cached 2 min) | Live DB via `UsageService.computeUsage()` | `LimitsService.checkLimit()` |
| **Historical reporting** | Daily snapshot (cron)          | Same queries, stored in `UsageRecord`     | Billing invoices, analytics  |

Limit enforcement always uses **live absolute counts** from the database. The daily snapshots are a separate concern — they record what the absolute values were each day, for billing and analytics purposes.

## Real-Time Usage Counting

`UsageService.computeUsage()` returns the **current absolute total** for a metric. These are not daily values — they represent the total state of the organization right now.

### Absolute Metrics

| Metric          | Query                               | What It Returns                                                |
| --------------- | ----------------------------------- | -------------------------------------------------------------- |
| `row_versions`  | TypedSQL: `countOrgRowVersions.sql` | Total unique row versions across all revisions in all projects |
| `projects`      | `prisma.project.count()`            | Total non-deleted projects                                     |
| `seats`         | `prisma.userOrganization.count()`   | Total user memberships                                         |
| `storage_bytes` | TODO (returns 0)                    | Total file storage consumed                                    |

These values go up when data is created and down when data is deleted. They never reset.

### Rate Metrics

| Metric      | Query            | What It Returns                     |
| ----------- | ---------------- | ----------------------------------- |
| `api_calls` | TODO (returns 0) | API calls made today (resets daily) |

Rate metrics track usage within a time window. The counter resets at the start of each period.

### Row-Version Counting (Deep Dive)

This is the most complex and expensive query. It counts unique `Row.versionId` values by joining through the full entity hierarchy:

```sql
Row → Table (M2M) → Revision (M2M) → Branch → Project → Organization
```

**Copy-on-write semantics:** When a row is unchanged between revisions, both revisions reference the same `Row` record (same `versionId`). It counts once. Only modified rows get new versions.

**Example:**

```
Initial state: 1,000 rows (1,000 unique versionIds)

Revision 2: edit 100 rows → 100 new versionIds created
Revision 3: edit 100 rows → 100 new versionIds created
Revision 4: edit 100 rows → 100 new versionIds created
Revision 5: edit 100 rows → 100 new versionIds created

Total row versions: 1,000 + 4 × 100 = 1,400 (not 5 × 1,000 = 5,000)
```

**Implementation:** TypedSQL in `prisma/sql/countOrgRowVersions.sql`:

```sql
SELECT COUNT(DISTINCT r."versionId") AS "count"
FROM "Row" r
JOIN "_RowToTable" rt ON rt."A" = r."versionId"
JOIN "Table" t ON t."versionId" = rt."B"
JOIN "_RevisionToTable" rvt ON rvt."B" = t."versionId"
JOIN "Revision" rv ON rv."id" = rvt."A"
JOIN "Branch" b ON b."id" = rv."branchId"
JOIN "Project" p ON p."id" = b."projectId"
WHERE p."organizationId" = $1
  AND p."isDeleted" = false
```

`_RowToTable` and `_RevisionToTable` are Prisma implicit many-to-many join tables. Column `A` references the first model alphabetically, `B` the second.

## Caching

Usage values are **not cached in UsageService** itself. Caching is handled by `BillingCacheService` in the calling layer (`LimitsService`):

- `UsageService` — always queries the database, returns fresh data
- `BillingCacheService` — wraps with 2-minute TTL cache + event-driven invalidation
- `LimitsService` — calls `billingCache.usage(orgId, metric, () => usageService.computeUsage(...))`

See [Cache Architecture](./cache.md) for details on TTLs and invalidation.

## Daily Snapshots

`UsageTrackingService` runs a cron at midnight to record **historical snapshots** of absolute values:

```
@Cron(EVERY_DAY_AT_MIDNIGHT)
snapshotUsage():
  1. Skip if REVISIUM_STANDALONE=true
  2. Find all subscriptions with status 'active' or 'early_adopter'
  3. For each subscription, for each metric:
     - Compute current absolute usage via UsageService.computeUsage()
     - Upsert into UsageRecord with yesterday's date as period
  4. Log completion
```

### What Snapshots Record

Each `UsageRecord` row says: "On this date, this organization had X total row_versions / Y total projects / Z total seats."

These are **point-in-time snapshots of absolute values**, not daily deltas. If an org had 5,000 row versions on Monday and 5,100 on Tuesday, the records would be:

| Date    | Metric       | Value |
| ------- | ------------ | ----- |
| Monday  | row_versions | 5,000 |
| Tuesday | row_versions | 5,100 |

The daily change (100 new versions) can be derived by subtracting consecutive snapshots.

### What Snapshots Are For

- **Billing invoices** — usage-based billing needs historical proof of consumption
- **Usage analytics** — growth trends, capacity planning
- **Dispute resolution** — verifiable record of usage on any given day

Snapshots are **not** used for limit enforcement — that always uses live data from the database.

### Idempotency

The unique constraint on `(subscriptionId, metric, periodStart)` ensures running the cron twice produces the same result — the second run upserts (updates) instead of inserting a duplicate.

### Why Yesterday

The cron runs at midnight and records usage for the completed day (yesterday 00:00 → 23:59:59.999). This ensures the snapshot represents a full 24-hour period.
