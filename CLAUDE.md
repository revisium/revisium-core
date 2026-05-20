# CLAUDE.md - revisium-core

NestJS backend for the Revisium versioned data platform. CQRS, Prisma, GraphQL + REST + MCP APIs. Enterprise features in `/ee/` with NoopService pattern.

## Quick Reference

```bash
npm run build              # Nest build + tsc-alias
npm run start:dev          # Watch mode
npm run tsc                # TypeScript type check (nest build --type-check, no emit)
npm test                   # Jest (50% workers, forceExit)
npm run test:cov           # Jest with coverage
npm run sonar:local        # Send existing local coverage to SonarCloud and wait for Quality Gate
npm run ci:local:sonar     # Start test DB, run coverage, send SonarCloud analysis, clean up
npm run lint:ci            # ESLint (max-warnings 0)
npm run lint:fix           # ESLint with auto-fix
npm run format             # Prettier write
npm run seed               # Database seeding
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate:deploy  # Apply migrations
```

## Local SonarCloud Check

CI keeps SonarCloud as a separate signal. The required `checks` job gates only
`lint`, `tsc`, and tests; SonarCloud still runs in GitHub Actions, but agents
should use the local commands below before marking a PR ready when Sonar changes
or coverage-sensitive code is touched.

Create a local token file from the example. Never commit the real token.

```bash
cp .env.sonar.example .env.sonar
```

Set `SONAR_TOKEN` in `.env.sonar`. Use a SonarCloud personal token with
`Execute Analysis` permission for `revisium_revisium-core`.

Fast path when `coverage/lcov.info` already exists:

```bash
npm run sonar:local
```

Strict path matching the local coverage flow:

```bash
npm run ci:local:sonar
```

`sonar:local` detects the current GitHub PR via `gh pr view` and sends PR
analysis to SonarCloud with `sonar.qualitygate.wait=true`. If no PR is attached,
it falls back to branch analysis. Generated `.env.sonar`, `.sonar/`,
`.scannerwork/`, and `coverage/` are intentionally ignored by git.

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
