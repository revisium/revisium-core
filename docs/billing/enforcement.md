# Enforcement

How and where plan limits are checked.

## Design Principles

1. **Fail open** — if anything is wrong (no subscription, unknown plan, cache down), allow the operation
2. **Fast path** — most checks are cached reads (sub-millisecond), expensive DB queries are rare
3. **Co-located** — limit checks live inside CQRS command handlers, next to the business logic they guard

## checkLimit Flow

```typescript
async checkLimit(organizationId, metric, increment):
  // 1. Org limits from payment service (in-memory Map cache, 5-min TTL)
  orgLimits = limitsCache.get(organizationId) ?? billingClient.getOrgLimits(organizationId)
  if !orgLimits → { allowed: true }  // fail-open

  // 2. Limit lookup (skip usage query if unlimited)
  limit = orgLimits.limits[metric]
  if limit === null → { allowed: true }

  // 3. Usage computation (cached 2 min via BillingCacheService)
  current = billingCache.usage(organizationId, metric, () => usageService.compute())
  if current + increment > limit → { allowed: false, current, limit, metric }

  → { allowed: true, current, limit }
```

Step 1 is an in-memory cache hit or HMAC-signed HTTP call to the payment service. Step 3 only executes when the org has a finite limit for this metric.

## Enforcement Points

| Handler                        | Metric          | Increment     | Notes                                |
| ------------------------------ | --------------- | ------------- | ------------------------------------ |
| `CreateRowsHandler`            | `row_versions`  | `rows.length` | New rows = new versions              |
| `UpdateRowsHandler`            | `row_versions`  | `rows.length` | Copy-on-write creates new versions   |
| `RenameRowHandler`             | `row_versions`  | `1`           | Rename creates a new version         |
| `UploadFileHandler`            | `storage_bytes` | `file.size`   | File upload size                     |
| `CreateProjectHandler`         | `projects`      | `1`           | Synchronous DB count                 |
| `AddUserToOrganizationHandler` | `seats`         | `1`           | Only for new users, not role updates |

### Why These Handlers

**Checked:** Operations that create new row versions (create, update, rename) or consume countable resources (projects, seats, storage).

**Not checked:**

- `PatchRowsHandler` — delegates to `UpdateRowsHandler` internally, check happens there
- `RevertChangesHandler` — restores head state, doesn't create new versions
- `RemoveRowsHandler` / `RemoveTableHandler` — removing data decreases usage, no limit needed
- `CreateTableHandler` — creating an empty table doesn't create row versions

### Handler Pattern

All draft mutation handlers follow the same pattern:

```typescript
// 1. Resolve revision context (sets organizationId in DraftRevisionRequestDto)
await this.draftTransactionalCommands.resolveDraftRevision(revisionId);

// 2. Check limit (fast cached read)
const limitResult = await this.limitsService.checkLimit(
  this.revisionRequestDto.organizationId,
  LimitMetric.ROW_VERSIONS,
  rows.length,
);
if (!limitResult.allowed) {
  throw new LimitExceededException(limitResult);
}

// 3. Continue with business logic...
```

For `CreateProjectHandler` and `AddUserToOrganizationHandler`, `organizationId` comes directly from the command data (no revision resolution needed).

## Error Response

When a limit is exceeded, `LimitExceededException` returns HTTP 403:

```json
{
  "statusCode": 403,
  "code": "LIMIT_EXCEEDED",
  "metric": "row_versions",
  "current": 10000,
  "limit": 10000,
  "message": "Plan limit exceeded for row_versions. Current: 10000, Limit: 10000"
}
```

## Noop Mode

When the payment service is not configured (`PAYMENT_SERVICE_URL` unset), `NoopLimitsService` is injected everywhere. It always returns `{ allowed: true }` with zero overhead — no cache reads, no DB queries, no conditional logic.

```typescript
// src/features/billing/noop-limits.service.ts
@Injectable()
export class NoopLimitsService implements ILimitsService {
  async checkLimit(): Promise<LimitCheckResult> {
    return { allowed: true };
  }
}
```
