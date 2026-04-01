# Developer Guide

How to extend the billing system.

## File Structure

```text
src/features/billing/               # Core (Apache 2.0)
  billing.module.ts                 # @Global, provides NoopLimitsService
  limits.interface.ts               # ILimitsService, LimitMetric, LimitCheckResult
  noop-limits.service.ts            # Always returns { allowed: true }
  limit-exceeded.exception.ts       # HTTP 403 with structured error

ee/billing/                         # Enterprise (proprietary)
  ee-billing.module.ts              # Registers all providers, overrides noop
  billing-client.interface.ts       # IBillingClient, OrgLimits, PlanInfo, etc.
  billing-client.ts                 # HMAC-signed HTTP client → payment service
  hmac.ts                           # signRequest / verifyRequest
  callback.controller.ts            # POST /billing/payment-callback (cache invalidation)
  usage-reporter.service.ts         # Hourly cron → payment service usage/report
  cache/
    billing-cache.constants.ts      # Cache keys, tags, TTL config
    billing-cache.service.ts        # Usage caching with tags
    billing-cache-invalidation.handler.ts  # 7 event-driven invalidation handlers
  limits/
    limits.service.ts               # Cached proxy: fetches limits from payment service
  usage/
    usage.service.ts                # Local Prisma queries (row versions, projects, seats)
  early-access/                     # REST + GraphQL endpoints for billing UI

ee/billing/__tests__/
  limits.service.spec.ts            # Mocked BillingClient, real Prisma for usage
  callback.controller.spec.ts       # HMAC verification
  billing-client.spec.ts            # Mocked fetch
  usage-reporter.service.spec.ts    # Mocked BillingClient + UsageService
  usage.service.spec.ts             # Real Prisma
  billing-cache.service.spec.ts
  billing-cache-invalidation.handler.spec.ts
  billing-api.e2e.spec.ts           # Full app with mocked BillingClient
```

## Adding a New Metric

Example: adding `max_branches` limit.

### Step 1: Add to LimitMetric enum

```typescript
// src/features/billing/limits.interface.ts
export enum LimitMetric {
  // ... existing
  BRANCHES = 'branches',
}
```

### Step 2: Add counting method to UsageService

```typescript
// ee/billing/usage/usage.service.ts
case LimitMetric.BRANCHES:
  return this.countBranches(organizationId);

private async countBranches(organizationId: string): Promise<number> {
  return this.prisma.branch.count({
    where: { project: { organizationId, isDeleted: false } },
  });
}
```

### Step 3: Map metric to limits response in LimitsService

```typescript
// ee/billing/limits/limits.service.ts — getLimitForMetric()
case LimitMetric.BRANCHES:
  return l.branches;  // must match the field name in OrgLimits.limits
```

### Step 4: Add limit field to payment service

In revisium-payment, add `branches` to the `OrgLimits.limits` response and the plan configuration.

### Step 5: Add checkLimit to the handler

```typescript
const limitResult = await this.limitsService.checkLimit(
  organizationId,
  LimitMetric.BRANCHES,
  1,
);
if (!limitResult.allowed) {
  throw new LimitExceededException(limitResult);
}
```

### Step 6: Add tests

## Testing Strategy

Tests use mocked `BillingClient` for payment service calls and real Prisma for local usage counting.

### Test Module Pattern

```typescript
const module = await Test.createTestingModule({
  imports: [DatabaseModule],
  providers: [
    LimitsService,
    BillingCacheService,
    UsageService,
    CacheService,
    { provide: CACHE_SERVICE, useClass: NoopCacheService },
    { provide: BILLING_CLIENT_TOKEN, useValue: mockBillingClient },
  ],
}).compile();
```

### Running Tests

```bash
npx jest ee/billing/__tests__/
```
