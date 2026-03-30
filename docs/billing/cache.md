# Cache Architecture

Billing uses the same BentoCache infrastructure as the rest of the platform, with domain-specific keys, tags, and event-driven invalidation.

## Cache Layers

```
Request → BillingCacheService → CacheService → BentoCache
                                                   │
                                          ┌────────┼────────┐
                                          │        │        │
                                        L1 mem   L2 Redis  Bus
                                       (always)  (optional) (sync)
```

- **L1 (memory):** Always available. Sub-millisecond reads.
- **L2 (Redis):** Optional. Shared across pods. ~0.5ms reads.
- **Bus (Redis or pg-bus):** Propagates invalidation across pods.
- **Noop mode:** When `CACHE_ENABLED=0`, factory is called on every request. Billing still works, just no caching.

## Keys and Tags

```
Keys:
  billing:sub:{orgId}              → Subscription record    (TTL: 5 min)
  billing:usage:{orgId}:{metric}   → Usage count number     (TTL: 2 min)
  billing:rev-org:{revisionId}     → Organization ID string (TTL: 1 day)

Tags:
  billing-org-{orgId}              → Groups all billing data for an org
  billing-usage-{orgId}            → Groups usage counts for an org
```

Tags enable bulk invalidation: `deleteByTag('billing-usage-org-123')` clears all usage cache entries for that org in one call.

## BillingCacheService

Wraps `CacheService` with billing-specific methods, following the same pattern as `RowCacheService`:

```typescript
// Cache a subscription lookup
billingCache.subscription(orgId, () => prisma.subscription.findUnique(...))

// Cache a usage computation
billingCache.usage(orgId, metric, () => usageService.computeUsage(...))

// Resolve revisionId → organizationId (for invalidation handlers)
billingCache.resolveOrgId(revisionId)

// Invalidation
billingCache.invalidateOrgUsage(orgId)    // Clear usage cache
billingCache.invalidateOrgBilling(orgId)  // Clear subscription + usage cache
```

## Event-Driven Invalidation

When data changes, usage cache is automatically invalidated via domain events. This ensures the cached usage count is refreshed after mutations.

```
Handler executes mutation
    ↓
Handler publishes event in postActions()
    ↓
EventBus dispatches to handlers
    ↓
BillingCacheInvalidationHandler receives event
    ↓
Resolves orgId from revisionId (cached 1 day)
    ↓
Calls billingCache.invalidateOrgUsage(orgId)
    ↓
BentoCache deletes all keys with tag 'billing-usage-{orgId}'
    ↓
Bus propagates deletion to other pods
```

### Events That Trigger Invalidation

| Event                    | Trigger               | Why                                 |
| ------------------------ | --------------------- | ----------------------------------- |
| `RowCreatedEvent`        | Row created           | Row version count changed           |
| `RowUpdatedEvent`        | Row updated           | New version created (copy-on-write) |
| `RowDeletedEvent`        | Row deleted           | Version may become orphaned         |
| `RowsDeletedEvent`       | Multiple rows deleted | Same as above                       |
| `RowRenamedEvent`        | Row renamed           | New version created                 |
| `RevisionRevertedEvent`  | Draft reverted        | Row versions may change             |
| `RevisionCommittedEvent` | Draft committed       | Row versions finalized              |

### Implementation

Seven event handlers, all extending a common base:

```typescript
// ee/billing/cache/billing-cache-invalidation.handler.ts
@EventsHandler(RowCreatedEvent)
export class BillingRowCreatedHandler {
  constructor(private readonly billingCache: BillingCacheService) {}

  async handle(event: RowCreatedEvent) {
    const orgId = await this.billingCache.resolveOrgId(event.revisionId);
    if (orgId) {
      await this.billingCache.invalidateOrgUsage(orgId);
    }
  }
}
```

If `resolveOrgId` returns null (unknown revision), the handler silently skips — no error, no invalidation. The cache entry will naturally expire via TTL.

## Multi-Pod Behavior

| Configuration    | Read Consistency    | Invalidation Propagation      |
| ---------------- | ------------------- | ----------------------------- |
| L1 + L2 (Redis)  | All pods share L2   | Via Redis bus                 |
| L1 only + pg-bus | Each pod has own L1 | Via PostgreSQL NOTIFY         |
| L1 only, no bus  | Each pod has own L1 | No propagation, relies on TTL |
| Cache disabled   | No caching          | N/A — always fresh from DB    |

**Worst case (L1 only, no bus):** After a mutation on pod A, pod B still serves the old usage count until the 2-minute TTL expires. This is acceptable — limits are approximate by design.

## TTL Strategy

| Cache Entry            | TTL   | Rationale                                            |
| ---------------------- | ----- | ---------------------------------------------------- |
| Subscription           | 5 min | Changes rarely (plan upgrade, cancellation)          |
| Usage count            | 2 min | Changes on every mutation, but counting is expensive |
| Revision → Org mapping | 1 day | Never changes (revision belongs to one org forever)  |
