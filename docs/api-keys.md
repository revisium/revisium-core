# API Keys

Revisium supports three types of API keys for programmatic access and service-to-service communication.

## Key Types

| Type | Purpose | Identity Field |
|------|---------|---------------|
| **PERSONAL** | User automation (CI/CD, scripts) — inherits user permissions | `userId` |
| **SERVICE** | External integrations — configurable CASL permissions | `serviceId` |
| **INTERNAL** | Service-to-service (endpoint→core) — full internal read | `internalServiceName` |

## Key Format

```text
rev_{22-char-nanoid}   (~26 chars total)
```

The `rev_` prefix is consistent with other token prefixes (`oat_`, `ort_`, `auth_`). Key type is not embedded in the prefix — it is determined by DB lookup after hash match.

Keys are hashed with SHA-256 before storage. The plaintext key is returned exactly once at creation and never stored.

## Content Scoping

Keys can be restricted to specific content within the hierarchy:

| Scope | Field | Empty value |
|-------|-------|-------------|
| Organization | `organizationId` | `null` = all user's orgs |
| Projects | `projectIds` | `[]` = all projects in org |
| Branches | `branchNames` | `[]` = all branches |
| Tables | `tableIds` | `[]` = all tables |

### `$default` branch resolution

`branchNames: ["$default"]` resolves at request time to the project's root branch (`isRoot: true`). The `$` prefix avoids collision with real branch names since identifier naming rules don't allow `$`.

### `readOnly` flag

Stored on the key record. Not yet enforced at the guard level — write requests are not blocked based on this flag alone. For SERVICE keys, use CASL permissions (omit `create`/`update`/`delete` actions) to restrict writes. Runtime enforcement of `readOnly` is planned for a future phase.

## Module Structure

```text
src/features/api-key/
├── api-key.module.ts                 # Module definition
├── api-key.service.ts                # Key generation, validation, hash, DB lookup
├── api-key-tracking.service.ts       # Debounced lastUsedAt updates (@Interval flush)
├── api-key-scope.service.ts          # Scope matching + $default branch resolution
├── commands/
│   ├── impl/
│   │   ├── create-api-key.command.ts
│   │   ├── revoke-api-key.command.ts
│   │   └── rotate-api-key.command.ts
│   └── handlers/
│       ├── create-api-key.handler.ts # Full input validation
│       ├── revoke-api-key.handler.ts # Sets revokedAt, does not delete
│       └── rotate-api-key.handler.ts # Atomic: revoke old + create new in transaction
└── queries/
    ├── impl/
    │   ├── get-api-keys.query.ts
    │   └── get-api-key-by-id.query.ts
    └── handlers/
        ├── get-api-keys.handler.ts
        └── get-api-key-by-id.handler.ts
```

## Services

### ApiKeyService

Domain logic — no DB writes except lookup.

- `generateKey()` → `{ key, hash, prefix }` — generates `rev_` prefixed key with nanoid
- `validateKeyFormat(key)` → `boolean` — regex `/^rev_[A-Za-z0-9_-]{22}$/`
- `hashKey(key)` → SHA-256 hex string
- `findByHash(keyHash)` → `ApiKey | null` — used by auth guard for authentication

### ApiKeyTrackingService

Infrastructure — buffered `lastUsedAt` / `lastUsedIp` updates.

- `track(keyId, ip)` — buffers the update in memory with IP normalization
- `flush()` — writes buffered entries to DB, serialized to prevent overlapping writes
- Runs on `@Interval(60_000)` via NestJS ScheduleModule
- On module destroy, flushes remaining buffer
- Failed updates are re-queued for next flush

### ApiKeyScopeService

Scope matching — `validateScope()` is synchronous, pure matching logic.

- `resolveBranchNames(branchNames, projectId)` — resolves `$default` tokens to actual branch names (DB call)
- `validateScope(apiKey, request, resolvedBranchNames?)` — checks org, project, branch, table scopes

Callers should resolve `$default` first, then pass the resolved names to `validateScope`.

## Commands

### CreateApiKey

Validates all inputs before creating:

- `name` — required, max 255 chars
- `serviceId` — validated with `validateUrlLikeId` (same rules as branch/table names)
- `internalServiceName` — max 50 chars
- `expiresAt` — must be in the future if provided
- Cross-field validation — PERSONAL keys can't have `serviceId`, SERVICE keys can't have `userId`, etc.

### RevokeApiKey

Sets `revokedAt` timestamp. Does not delete the row — revoked keys remain for audit trail.

### RotateApiKey

Atomic transaction:
1. Revoke old key (sets `revokedAt`, frees unique `serviceId` by suffixing `:revoked:{timestamp}`)
2. Create new key with same identity, scope, and permissions

After transaction, sets `replacedById` on old key (best-effort — logged on failure).

## Database Schema

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `TEXT PK` | Nanoid, auto-generated |
| `prefix` | `TEXT` | Display prefix, always `rev_` |
| `keyHash` | `TEXT UNIQUE` | SHA-256 hex of the full key. Used for authentication lookup. The plaintext key is never stored |
| `type` | `ApiKeyType` | `PERSONAL`, `SERVICE`, or `INTERNAL` |
| `name` | `TEXT` | User-provided descriptive name (e.g. "GitHub Actions", "CRM Integration"). Max 255 chars (validated in handler) |
| `userId` | `TEXT FK → User` | Owner for PERSONAL keys. `ON DELETE CASCADE` — deleting the user revokes all their keys. `null` for SERVICE/INTERNAL |
| `serviceId` | `TEXT UNIQUE` | Stable identifier for SERVICE keys (e.g. `crm-integration`, `ecommerce-sync`). Must match `validateUrlLikeId` format. `null` for PERSONAL/INTERNAL. On rotation, the old key's serviceId is suffixed with `:revoked:{timestamp}` to free the unique constraint |
| `internalServiceName` | `TEXT` | Service name for INTERNAL keys: `endpoint`, `worker`, `scheduler`. `null` for PERSONAL/SERVICE. Max 50 chars (validated in handler) |
| `organizationId` | `TEXT` | Restrict to one organization. `null` = all user's organizations |
| `projectIds` | `TEXT[]` | Restrict to specific projects. `[]` = all projects in the org |
| `branchNames` | `TEXT[]` | Restrict to specific branches by name. `[]` = all branches. Supports `$default` token (resolved at request time to the project's root branch) |
| `tableIds` | `TEXT[]` | Restrict to specific tables. `[]` = all tables |
| `permissions` | `JSONB` | CASL permission rules for SERVICE keys. `null` for PERSONAL (inherits user perms) and INTERNAL (full read) |
| `readOnly` | `BOOLEAN` | When `true`, blocks all write operations on the draft. Default `false` |
| `allowedIps` | `TEXT[]` | IP allowlist. `[]` = no IP restriction |
| `expiresAt` | `TIMESTAMP` | Auto-expiration. `null` = never expires. Must be in the future at creation |
| `revokedAt` | `TIMESTAMP` | Set when key is revoked. `null` = active. Revoked keys are never deleted (audit trail) |
| `replacedById` | `TEXT FK → ApiKey` | Points to the replacement key after rotation. `ON DELETE SET NULL`. Used for rotation lineage tracking |
| `lastUsedAt` | `TIMESTAMP` | Last authentication timestamp. Updated in batches (debounced every 60s) |
| `lastUsedIp` | `TEXT` | IP of last use. Normalized in tracking service (first from comma-separated, max 45 chars) |
| `createdAt` | `TIMESTAMP` | Creation timestamp |

### Indexes

- `userId` — list personal keys by user
- `type` — filter by key type
- `expiresAt` — find expired keys for cleanup
- `keyHash` (unique) — authentication lookup
- `serviceId` (unique) — ensure one active key per service

### `permissions` JSONB structure

The `permissions` field stores CASL rules for SERVICE keys. PERSONAL keys inherit user permissions, so this field is `null` for them.

```jsonc
{
  "rules": [
    {
      "action": "read",                              // "read", "create", "update", "delete", "manage"
      "subject": ["Project", "Branch", "Table", "Row"], // CASL subjects
      "conditions": { "organizationId": "org-123" }  // optional field-level conditions
    },
    {
      "action": ["create", "update"],
      "subject": "Row",
      "conditions": { "tableId": { "$in": ["products", "categories"] } }
    }
  ]
}
```

## Examples

### Personal key for CI/CD

```typescript
// A user creates a key scoped to one project, read-write on the default branch
await commandBus.execute(new CreateApiKeyCommand({
  type: 'PERSONAL',
  name: 'GitHub Actions',
  userId: 'user-abc',
  projectIds: ['proj-website'],
  branchNames: ['$default'],
  readOnly: false,
  expiresAt: new Date('2027-01-01'),
}));
// → { key: 'rev_V1StGXR8_Z5jdHi6B-myT', id: '...', ... }
```

Resulting row:

| Field | Value |
|-------|-------|
| `type` | `PERSONAL` |
| `userId` | `user-abc` |
| `serviceId` | `null` |
| `projectIds` | `{proj-website}` |
| `branchNames` | `{$default}` |
| `permissions` | `null` (inherits user perms) |
| `readOnly` | `false` |

### Service key for external CRM

```typescript
// Admin creates a read-only key for a CRM that syncs product data
await commandBus.execute(new CreateApiKeyCommand({
  type: 'SERVICE',
  name: 'Salesforce Sync',
  serviceId: 'salesforce-sync',
  organizationId: 'org-123',
  tableIds: ['products', 'categories'],
  readOnly: true,
  permissions: {
    rules: [
      {
        action: 'read',
        subject: ['Table', 'Row'],
        conditions: { tableId: { $in: ['products', 'categories'] } },
      },
    ],
  },
}));
```

Resulting row:

| Field | Value |
|-------|-------|
| `type` | `SERVICE` |
| `userId` | `null` |
| `serviceId` | `salesforce-sync` |
| `organizationId` | `org-123` |
| `tableIds` | `{products,categories}` |
| `permissions` | `{"rules": [{"action": "read", "subject": ["Table", "Row"], ...}]}` |
| `readOnly` | `true` |

### Internal key for endpoint service

```typescript
// Generated at deployment for service-to-service auth
await commandBus.execute(new CreateApiKeyCommand({
  type: 'INTERNAL',
  name: 'Endpoint Service',
  internalServiceName: 'endpoint',
}));
```

Resulting row:

| Field | Value |
|-------|-------|
| `type` | `INTERNAL` |
| `userId` | `null` |
| `serviceId` | `null` |
| `internalServiceName` | `endpoint` |
| `organizationId` | `null` (unrestricted) |
| `projectIds` | `{}` (all) |
| `branchNames` | `{}` (all) |
| `permissions` | `null` (full internal read) |
| `readOnly` | `false` |

### Key rotation

```typescript
const rotated = await commandBus.execute(
  new RotateApiKeyCommand({ keyId: 'old-key-id' }),
);
// → { key: 'rev_newRandomNanoid22chars', id: 'new-key-id', ... }
```

After rotation, the database has:

| Key | `revokedAt` | `replacedById` | `serviceId` |
|-----|-------------|----------------|-------------|
| old | `2026-04-04T12:00:00Z` | `new-key-id` | `salesforce-sync:revoked:1743782400000` |
| new | `null` | `null` | `salesforce-sync` |

## Authentication Headers

| Header | Key Types | Priority |
|--------|-----------|----------|
| `X-Internal-Api-Key` | INTERNAL only | 1 (highest) |
| `X-Api-Key` | PERSONAL, SERVICE | 2 |
| `Authorization: Bearer` | JWT tokens | 3 |
| `?api_key=` query param | PERSONAL, SERVICE | 4 (webhooks) |

## Service Key Management API

Service keys are managed by organization admins (or system admins) via GraphQL mutations.

### Mutations

```graphql
mutation CreateServiceApiKey($data: CreateServiceApiKeyInput!) {
  createServiceApiKey(data: $data) {
    apiKey { id prefix type name organizationId permissions }
    secret
  }
}

input CreateServiceApiKeyInput {
  name: String!
  organizationId: String!
  projectIds: [String!]
  branchNames: [String!]
  tableIds: [String!]
  readOnly: Boolean
  allowedIps: [String!]
  expiresAt: DateTime
  permissions: CaslPermissionsInput!
}

input CaslPermissionsInput {
  rules: [CaslRuleInput!]!
}

input CaslRuleInput {
  action: [String!]!
  subject: [String!]!
  conditions: JSON
  fields: [String!]
  inverted: Boolean
}
```

Revoke and rotate use the same `revokeApiKey` / `rotateApiKey` mutations as personal keys. Admin ownership is checked: only org owner/admin of the key's org (or system admin) can operate.

### Queries

```graphql
query ServiceApiKeys($organizationId: String!) {
  serviceApiKeys(organizationId: $organizationId) {
    id type name permissions readOnly revokedAt
  }
}
```

### Access Control

| Role | Can manage service keys? |
|------|-------------------------|
| Organization owner | Yes (own org) |
| Organization admin | Yes (own org) |
| Developer / Editor / Reader | No (403) |
| System admin | Yes (any org) |

### Authentication Flow

When a SERVICE key authenticates, the stored CASL permission rules are loaded into the request context. `BasePermissionGuard` builds a CASL ability from these rules and checks each required permission. Scope fields (organizationId, projectIds, branchNames, tableIds) are enforced by `ApiKeyScopeService` as with personal keys.

