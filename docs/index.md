# revisium-core Documentation

Technical documentation for the Revisium Core backend.

## Contents

- [OAuth 2.1 & MCP Authentication](./oauth.md) - OAuth 2.1 Provider, PKCE, token lifecycle, stateless MCP transport
- [Versioning System](./versioning.md) - Data model, draft operations, revert rules, hasChanges system, invariants
- [File Storage](./file-storage.md) - Storage providers, file plugin, upload workflow, file serving, configuration
- [Billing & Limits](./billing.md) - Plan limits, usage tracking, enforcement, caching, data models
  - [Enforcement](./billing/enforcement.md) - Which operations are checked, when, and how
  - [Plans & Limits](./billing/plans.md) - Plan definitions, metrics, extensibility
  - [Cache Architecture](./billing/cache.md) - Caching strategy, invalidation, multi-pod
  - [Data Models](./billing/data-models.md) - Subscription, UsageRecord, Prisma schema
  - [Usage Tracking](./billing/usage-tracking.md) - Row-version counting, daily snapshots
  - [Subscription Lifecycle](./billing/subscription-lifecycle.md) - Status transitions, payments
  - [Early Adopter Program](./billing/early-access.md) - Free Pro features, transition to paid
  - [Developer Guide](./billing/developer-guide.md) - Adding metrics, testing, deployment
