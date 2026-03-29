# CLAUDE.md - revisium-core

NestJS backend for the Revisium versioned data platform. CQRS, Prisma, GraphQL + REST + MCP APIs. Enterprise features in `/ee/` with NoopService pattern.

## Quick Reference

```bash
npm run build              # Nest build + tsc-alias
npm run start:dev          # Watch mode
npm run tsc                # TypeScript type check (nest build --type-check, no emit)
npm test                   # Jest (50% workers, forceExit)
npm run test:cov           # Jest with coverage
npm run lint:ci            # ESLint (max-warnings 0)
npm run lint:fix           # ESLint with auto-fix
npm run format             # Prettier write
npm run seed               # Database seeding
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate:deploy  # Apply migrations
```

## Knowledge Base

Architectural knowledge for this project is stored in Revisium:
https://cloud.revisium.io org: `revisium-kb`, project: `kb-revisium-core`

MCP server: `revisium-cloud-io`

### Connecting

```text
get_branch("revisium-kb", "kb-revisium-core", "master")
→ returns headRevisionId (committed) and draftRevisionId (working state)
```

- **draftRevisionId** — always use for reads. Contains latest content including uncommitted updates.
- **headRevisionId** — last committed snapshot. May lag behind draft.

### Loading context

Load relevant kb rows before exploring code:
- `get_row(draftRevisionId, "architecture", "overview")` — start here
- `get_rows(draftRevisionId, "modules")` — all modules overview
- `get_row(draftRevisionId, "modules", "<module-name>")` — per-module details
- `get_rows(draftRevisionId, "decisions")` — architectural decisions
- `get_row(draftRevisionId, "commands", "all-commands")` — all npm scripts
- `search_rows(draftRevisionId, "keyword")` — find anything

### Reviewing changes before commit

Before proposing `create_revision`, check what's pending:
- `get_revision_changes(draftRevisionId)` — shows all uncommitted row/table changes
- If no changes — nothing to commit
- If changes exist — summarize them to the user and ask for approval

### Trust level

KB may be outdated if code changed but kb was not updated.
Always verify critical details against actual code before relying on kb.
If you find a discrepancy — fix the code task first, then propose updating kb.

### Update rules

- **Read** — freely, no approval needed
- **Update row content** — after significant code changes, always update the relevant kb rows before finishing the task
- **Schema changes** (new tables, new fields) — ask the user first
- **create_revision** — ask the user first, show pending changes, batch related updates into one commit

## Architecture Reference

ADRs and specifications are in `../architecture/`:
- [ADR-0037](../architecture/adr/ADR-0037-enterprise-feature-gating.md) — Enterprise Feature Gating (/ee/)
- [ADR-0038](../architecture/adr/ADR-0038-billing-limits-architecture.md) — Billing & Limits Architecture
- See `../architecture/CLAUDE.md` for full index
