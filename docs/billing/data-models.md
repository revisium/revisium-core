# Data Models

Prisma models for billing, defined in `prisma/schema.prisma`.

## Entity Relationship

```
Organization (core)
    │
    │ organizationId (FK, unique, 1:1)
    ▼
Subscription
    │
    │ subscriptionId (FK)
    ▼
UsageRecord (1:N)
```

## Subscription

One per organization. Created when an org signs up for a plan.

```prisma
model Subscription {
  id                       String          @id @default(nanoid())
  createdAt                DateTime        @default(now())
  updatedAt                DateTime        @updatedAt

  organizationId           String          @unique
  organization             Organization    @relation(fields: [organizationId], references: [id])
  planId                   String
  status                   BillingStatus   @default(free)
  interval                 BillingInterval?

  // Payment provider
  provider                 String?         // "stripe", "cloudpayments", "btcpay", "manual"
  externalCustomerId       String?
  externalSubscriptionId   String?

  // Billing period
  currentPeriodStart       DateTime?
  currentPeriodEnd         DateTime?
  cancelAt                 DateTime?

  usageRecords             UsageRecord[]

  @@index([status])
  @@index([provider])
}
```

### Key Design Decisions

- **FK to Organization** — `organizationId` references `Organization.id` with `ON DELETE RESTRICT`. Deleting an org with an active subscription requires removing the subscription first.
- **planId is a string** — Plans live in `HardcodedPlanProvider` (or future revisium-billing), not in the database. No FK constraint.
- **organizationId is unique** — One subscription per org. Enforced at the database level.

## UsageRecord

Daily usage snapshots. One record per subscription per metric per day.

```prisma
model UsageRecord {
  id              String       @id @default(nanoid())
  createdAt       DateTime     @default(now())

  subscriptionId  String
  subscription    Subscription @relation(fields: [subscriptionId], references: [id])

  metric          String       // "row_versions", "projects", "seats", etc.
  value           BigInt
  periodStart     DateTime
  periodEnd       DateTime

  @@unique([subscriptionId, metric, periodStart])
  @@index([subscriptionId, metric, periodStart])
}
```

### Key Design Decisions

- **BigInt for value** — Row version counts can exceed 2^31 for large organizations.
- **Unique constraint** — `(subscriptionId, metric, periodStart)` ensures idempotent writes. Running the snapshot cron twice on the same day upserts instead of duplicating.
- **Period covers yesterday** — The midnight cron records usage for the completed day (yesterday 00:00 → 23:59:59.999), not the day starting.

## Enums

```prisma
enum BillingStatus {
  free            // Default, no payment
  early_adopter   // Beta users with special terms
  active          // Paying customer
  past_due        // Payment failed, grace period
  cancelled       // Subscription ended
}

enum BillingInterval {
  monthly
  yearly
}
```

## Migration

The migration `20260329093749_add_billing_models` creates:

- `BillingStatus` and `BillingInterval` enums
- `Subscription` table with unique `organizationId` index
- `UsageRecord` table with composite unique + index
- FK from `UsageRecord.subscriptionId` to `Subscription.id`

This migration is additive — it creates new tables and does not modify existing ones.
