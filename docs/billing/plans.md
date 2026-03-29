# Plans & Limits

Plan definitions, metrics, and how to extend them.

## Metric Types

There are two types of limits:

### Absolute Limits

These track the **total current count** across the organization. They never reset — usage grows as data is created and shrinks as data is deleted.

| Metric          | What It Counts                                           | Example                          |
| --------------- | -------------------------------------------------------- | -------------------------------- |
| `row_versions`  | Unique row versions across all revisions in all projects | Org has 1,400 row versions total |
| `projects`      | Non-deleted projects                                     | Org has 3 projects               |
| `seats`         | User memberships in the organization                     | Org has 5 members                |
| `storage_bytes` | Total file storage consumed                              | Org uses 2.3 GB                  |

For absolute limits, `checkLimit()` compares `current total + increment` against the plan maximum. For example, if the plan allows 10,000 row versions and the org currently has 9,990, creating 20 rows is denied (9,990 + 20 > 10,000).

### Rate Limits

These track usage **per time window** and reset at the start of each period.

| Metric      | What It Counts                        | Window                       |
| ----------- | ------------------------------------- | ---------------------------- |
| `api_calls` | API requests made by the organization | Per day (resets at midnight) |

For rate limits, `checkLimit()` compares `today's count + 1` against the daily maximum.

## Default Plans

Three plans are hardcoded as fallback (`HardcodedPlanProvider`):

| Plan       | Row Versions | Projects  | Seats     | Storage   | API Calls/Day | Monthly | Yearly |
| ---------- | ------------ | --------- | --------- | --------- | ------------- | ------- | ------ |
| Free       | 10,000       | 3         | 1         | 500 MB    | 1,000         | $0      | $0     |
| Pro        | 500,000      | 20        | 10        | 10 GB     | 50,000        | $29     | $290   |
| Enterprise | unlimited    | unlimited | unlimited | unlimited | unlimited     | $99     | $990   |

`null` means unlimited — the limit check skips the usage query entirely.

All limits except `api_calls` are **absolute** — they represent the maximum total the org can have at any point in time, not a daily allowance. An org on the Free plan can have up to 10,000 row versions total, not 10,000 per day.

## Plan Interface

```typescript
interface Plan {
  id: string; // "free", "pro", "enterprise"
  name: string;
  isPublic: boolean;
  sortOrder: number;

  // Absolute limits (total count, null = unlimited)
  maxRowVersions: number | null;
  maxProjects: number | null;
  maxSeats: number | null;
  maxStorageBytes: number | null;

  // Rate limits (per time window, null = unlimited)
  maxApiCallsPerDay: number | null;

  monthlyPriceUsd: number;
  yearlyPriceUsd: number;
  features: Record<string, boolean>; // { sso: true, audit: true }
}
```

## Plan Provider Architecture

Plans come from `IPlanProvider`, injected via `PLAN_PROVIDER_TOKEN`:

```typescript
interface IPlanProvider {
  getPlans(): Promise<Plan[]>;
  getPlan(planId: string): Promise<Plan | null>;
}
```

### HardcodedPlanProvider (current)

Returns the three plans above from TypeScript constants. No I/O, instant response. Used as fallback when the dynamic provider is unavailable.

### RevisiumPlanProvider (future)

Will fetch plans from a revisium-billing instance via `@revisium/client`. Plans are version-controlled in Revisium itself (dogfooding). Cached with 5-minute TTL. Falls back to `HardcodedPlanProvider` if unreachable.

## Adding a New Plan

1. Add the plan object to `HARDCODED_PLANS` in `ee/billing/plan/hardcoded-plan-provider.ts`
2. Set limits for each metric (`null` for unlimited)
3. The plan is immediately available — no migration needed (plans are not in the database)

## Adding a New Metric

See [Developer Guide](./developer-guide.md#adding-a-new-metric).
