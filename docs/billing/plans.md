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

## Default Plans

Defined in revisium-payment's `PlanService`:

| Plan | Row Versions | Projects | Seats | Storage | API Calls/Day | Monthly | Yearly |
|---|---|---|---|---|---|---|---|
| Free | 10,000 | 3 | 1 | 100 MB | 1,000 | $0 | $0 |
| Pro | 500,000 | 20 | 10 | 10 GB | 50,000 | $29 | $290 |
| Enterprise | unlimited | unlimited | unlimited | unlimited | unlimited | custom | custom |

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
    "api_calls_per_day": 50000
  }
}
```

The payment service handles plan resolution internally (subscription → plan → limits).

## Adding a New Plan

Plans are managed in the payment service. See revisium-payment's `PlanService` and the `revisium-payment-config` Revisium project.
