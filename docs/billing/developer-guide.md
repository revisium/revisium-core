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
  cache/
    billing-cache.constants.ts      # Cache keys, tags, TTL config
    billing-cache.service.ts        # Subscription + usage caching with tags
    billing-cache-invalidation.handler.ts  # 7 event-driven invalidation handlers
  limits/
    limits.service.ts               # Real limit checking with cached lookups
  plan/
    plan.interface.ts               # Plan type, IPlanProvider, PLAN_PROVIDER_TOKEN
    hardcoded-plan-provider.ts      # Free/Pro/Enterprise constants
  usage/
    usage.service.ts                # Raw usage computation (DB queries)
    usage-tracking.service.ts       # Daily cron snapshots

ee/billing/__tests__/               # Tests (real Prisma, no mocks)
  limits.service.spec.ts
  usage.service.spec.ts
  usage-tracking.service.spec.ts
  hardcoded-plan-provider.spec.ts
  billing-cache.service.spec.ts
  billing-cache-invalidation.handler.spec.ts

prisma/
  schema.prisma                     # Subscription, UsageRecord models
  sql/countOrgRowVersions.sql       # TypedSQL for row-version counting
  migrations/..._add_billing_models/
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

### Step 2: Add to Plan interface

```typescript
// ee/billing/plan/plan.interface.ts
export interface Plan {
  // ... existing
  maxBranches: number | null;
}
```

### Step 3: Update HardcodedPlanProvider

```typescript
// ee/billing/plan/hardcoded-plan-provider.ts
{ id: 'free', ..., maxBranches: 5 },
{ id: 'pro', ..., maxBranches: 50 },
{ id: 'enterprise', ..., maxBranches: null },
```

### Step 4: Add counting method to UsageService

```typescript
// ee/billing/usage/usage.service.ts
case LimitMetric.BRANCHES:
  return this.countBranches(organizationId);

private async countBranches(organizationId: string): Promise<number> {
  return this.prisma.branch.count({
    where: {
      project: { organizationId, isDeleted: false },
    },
  });
}
```

### Step 5: Add metric mapping to LimitsService

```typescript
// ee/billing/limits/limits.service.ts
case LimitMetric.BRANCHES: return plan.maxBranches;
```

### Step 6: Add checkLimit to the handler

```typescript
// src/features/branch/commands/handlers/create-branch.handler.ts
const limitResult = await this.limitsService.checkLimit(
  organizationId,
  LimitMetric.BRANCHES,
  1,
);
if (!limitResult.allowed) {
  throw new LimitExceededException(limitResult);
}
```

### Step 7: Add tests

Add a test case in `ee/billing/__tests__/limits.service.spec.ts` and `ee/billing/__tests__/usage.service.spec.ts`.

## Adding a New Plan

Just add a plan object to `HARDCODED_PLANS` in `ee/billing/plan/hardcoded-plan-provider.ts`. No migration needed.

## Testing Strategy

All billing tests use real Prisma against the test database — no mocks.

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
    { provide: PLAN_PROVIDER_TOKEN, useClass: HardcodedPlanProvider },
    { provide: ConfigService, useValue: { get: (key) => configValues[key] } },
  ],
}).compile();
```

- `DatabaseModule` provides real `PrismaService` connected to test DB
- `NoopCacheService` makes cache transparent (always calls factory)
- `ConfigService` is mocked to control env vars per test
- Each test creates its own org/subscription/data via `prisma.*` calls

### Running Tests

```bash
# Run all billing tests
npx jest ee/billing/__tests__/ src/features/billing/__tests__/

# Run with coverage
npx jest ee/billing/__tests__/ --coverage --collectCoverageFrom='ee/billing/**/*.ts'
```

### Test Database Setup

Tests require the test DB to have billing tables:

```bash
npx dotenv -e .env.test -- npx prisma migrate deploy
```

## Deployment Checklist

1. Run `prisma migrate deploy` to create Subscription/UsageRecord tables
2. Set `REVISIUM_BILLING_ENABLED=true` in cloud environment
3. Set `REVISIUM_LICENSE_KEY` to a valid license
4. Create Subscription records for existing organizations (or they'll be unlimited)
5. Verify cache is working (`CACHE_ENABLED=1`) for optimal performance
