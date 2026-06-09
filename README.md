<div align="center">

# @revisium/core

Backend API for [Revisium](https://github.com/revisium/revisium) — unopinionated data platform with referential integrity.

**Your schema. Your data. Full control.**

[![License](https://img.shields.io/github/license/revisium/revisium-core?color=blue)](LICENSE)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=revisium_revisium-core&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=revisium_revisium-core)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=revisium_revisium-core&metric=coverage)](https://sonarcloud.io/summary/new_code?id=revisium_revisium-core)
[![npm](https://img.shields.io/npm/v/@revisium/core?color=red)](https://www.npmjs.com/package/@revisium/core)
[![Docker](https://img.shields.io/docker/v/revisium/revisium-core?label=docker&sort=semver)](https://hub.docker.com/r/revisium/revisium-core)

> Referential integrity with foreign keys at any depth.
> Git-like versioning: branches, revisions, drafts.
> Schema evolution: migrations with data transformations.

Part of the [Revisium](https://github.com/revisium/revisium) ecosystem.
Available on [npm](https://www.npmjs.com/package/@revisium/core) | [Docker Hub](https://hub.docker.com/r/revisium/revisium-core).

</div>

## Architecture

<div align="center">

```text
┌─────────────────────────────────────────────────────────┐
│                      API Layer                          │
├─────────────────┬─────────────────┬─────────────────────┤
│    GraphQL      │    REST API     │        MCP          │
│  (Apollo Server)│                 │  (Model Context     │
│                 │                 │   Protocol)         │
├─────────────────┴─────────────────┴─────────────────────┤
│                   Application Layer                     │
│              CQRS: Commands & Queries                   │
├─────────────────────────────────────────────────────────┤
│                    Domain Layer                         │
│         Business Logic, Validation, Events              │
├─────────────────────────────────────────────────────────┤
│                 Infrastructure Layer                    │
├───────────┬─────────┬───────────┬───────────────────────┤
│ PostgreSQL│  Redis  │    S3     │        SMTP           │
│ (Prisma)  │ (Cache) │ (Files)   │       (Email)         │
└───────────┴─────────┴───────────┴───────────────────────┘
```

</div>

### API Layer

| Interface | Description |
|-----------|-------------|
| **GraphQL** | Primary API. Apollo Server with subscriptions |
| **REST** | HTTP endpoints for integrations |
| **MCP** | Model Context Protocol for AI agents (Claude, etc.) |

### Application Layer

CQRS pattern separates read and write operations:
- **Commands** — mutations (create, update, delete)
- **Queries** — data retrieval with filtering and pagination

### Domain Layer

- JSON Schema validation
- Foreign key integrity checks
- Revision and branch management
- Schema migration engine

### Infrastructure

| Component | Purpose |
|-----------|---------|
| **PostgreSQL** | Primary data storage (via Prisma ORM) |
| **Redis** | Caching and pub/sub |
| **S3** | File storage |
| **SMTP** | Email notifications |

## Development

This project uses [pnpm](https://pnpm.io) (pinned via the `packageManager` field). Node version: see `.nvmrc` (24.11.1).

```bash
corepack enable           # activates the pinned pnpm
pnpm install              # install dependencies (build scripts gated by pnpm-workspace.yaml allowBuilds)

pnpm run lint:ci          # lint
pnpm run tsc              # type-check
pnpm test                 # tests
pnpm run build            # build
```

The generated Prisma client (`src/__generated__/client`) is committed — no need to run `pnpm exec prisma generate` for normal dev. To regenerate (requires a running DB):

```bash
cp .env.example .env
pnpm exec prisma generate --sql
```

Tests require a running Postgres + Redis + Mailhog (via docker-compose):

```bash
pnpm run docker:test-container-up    # starts test DB and applies migrations + seed
pnpm test
pnpm run docker:test-container-down  # tears down test containers
```

## Documentation

- [ENV.md](./ENV.md) — Environment variables
- [docs/](./docs/index.md) — Technical documentation

## Related Packages

| Package | Description |
|---------|-------------|
| [@revisium/endpoint](https://github.com/revisium/revisium-endpoint) | Dynamic GraphQL/REST API generator |
| [@revisium/schema-toolkit](https://github.com/revisium/schema-toolkit) | JSON Schema utilities, validation, and transformation helpers |
| [@revisium/formula](https://github.com/revisium/formula) | Formula expression parser and evaluator for computed fields |
| [revisium-cli](https://github.com/revisium/revisium-cli) | CLI for migrations — save and apply schema & data changes across environments |

## License

Apache 2.0 — see [LICENSING.md](./LICENSING.md) for details. Code in `ee/` directories is licensed under the [Revisium Enterprise License](./ee/LICENSE).
