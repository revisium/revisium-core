# Plans & Limits

Plan definitions live in **revisium-payment** (fetched from revisium-payment-config with 5-min cache, hardcoded fallback). Core fetches them via `BillingClient`.

## Metric Types

### Absolute Limits

Total count across the org, never resets.

| Metric | What It Counts | Example |
|---|---|---|
| `row_versions` | Unique row versions across all revisions in all projects | Org has 1,400 row versions total |
| `projects` | Non-deleted projects | Org has 3 projects |
| `seats` | User memberships in the organization | Org has 5 members |
| `storage_bytes` | Total file storage consumed | Org uses 2.3 GB |

### Rate Limits

Resets per time window.

| Metric | What It Counts | Window |
|---|---|---|
| `api_calls` | API requests made by the organization | Per day (resets at midnight) |

Note: `LimitMetric.API_CALLS` maps to `api_calls_per_day` in the payment service `OrgLimits.limits` response.

### Resource-Level Limits

Scoped to a specific entity within the org.

| Metric | What It Counts | Scope |
|---|---|---|
| `rows_per_table` | Rows in a specific table within a revision | Per table |
| `tables_per_revision` | Tables in the draft revision of the root branch | Per project |
| `branches_per_project` | Total branches in a project | Per project |

## Default Plans

Defined in revisium-payment's `PlanService`:

| Plan | Row Versions | Projects | Seats | Storage | API Calls/Day | Rows/Table | Tables/Rev | Branches/Project | Monthly | Yearly |
|---|---|---|---|---|---|---|---|---|---|---|
| Free | 10,000 | 3 | 1 | 100 MB | 1,000 | 1,000 | 10 | 3 | $0 | $0 |
| Pro | 500,000 | 20 | 10 | 10 GB | 50,000 | 10,000 | 100 | 20 | $29 | $290 |
| Enterprise | unlimited | unlimited | unlimited | unlimited | unlimited | unlimited | unlimited | unlimited | custom | custom |

`null` means unlimited — the limit check skips the usage query entirely.

## How Core Gets Plan Limits

Core doesn't resolve plans directly. It calls `BillingClient.getOrgLimits(orgId)` which returns the **resolved limits** from the payment service:

```json
{
  "planId": "pro",
  "status": "early_adopter",
  "limits": {
    "row_versions": 500000,
    "projects": 20,
    "seats": 10,
    "storage_bytes": 10000000000,
    "api_calls_per_day": 50000,
    "rows_per_table": 10000,
    "tables_per_revision": 100,
    "branches_per_project": 20
  }
}
```

The payment service handles plan resolution internally (subscription → plan → limits).

The payment service supports per-org limit overrides via `limitOverrides` JSON column on the Subscription model. When overrides are set, the response reflects the effective limits (plan defaults merged with overrides). `null` in overrides means unlimited for that metric.

## Adding a New Plan

Plans are managed in the payment service. See revisium-payment's `PlanService` and the `revisium-payment-config` Revisium project.
