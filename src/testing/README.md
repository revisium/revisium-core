# src/testing

Shared test support for `revisium-core`. Lives outside any `__tests__`
folder so spec files can import from here without producing cyclic /
test-only barrels. See [`docs/testing-architecture.md`](../../docs/testing-architecture.md)
for the principles that govern this layout.

## Layout

| Folder | Purpose |
| --- | --- |
| `kit/` | Shared test kits that bootstrap a **narrow Nest testing module** for a feature area and own its teardown via `module.close()`. New DB-backed feature specs should default to one of these. |
| `scenarios/` | Named business setup helpers (`given...`). They compose primitive factories into a realistic starting state so a spec can describe behaviour, not wiring. |
| `factories/` | Primitive builders (`testCreateUser`, `testCreateOrganization`, …). Prefer using a scenario; reach for a factory only when you genuinely need one narrow record. |
| `assertions/` | Reusable expectations (e.g. `findConstraint`). |
| `e2e/` | Full-app helpers: `createFreshTestApp`, GraphQL/HTTP request helpers, readonly fixtures. Used by transport and e2e specs. |
| `plugin/` | Test support for the plugin feature area (file restore, etc.). |
| `infrastructure/` | Test doubles for infrastructure layers (e.g. in-memory Bento cache). |
| `utils/` | Low-level helpers that do not fit elsewhere (gql tag, prepareProject seeding, file helpers). |

## Kits

Current kits:

- `create-project-command-test-kit.ts` — full `CoreModule` + the services a project-command spec usually needs (`EndpointNotificationService`, `ShareTransactionalQueries`). Exposes `executeSerializable`.
- `create-api-key-command-test-kit.ts` — `CqrsModule` + `RevisiumCacheModule` + all api-key handlers. Accepts `configValues` for limit-related tests.
- `create-user-query-test-kit.ts` — `CqrsModule` + `PrismaService` + all user query handlers.

Every kit returns `{ module, ...services, close(): Promise<void> }`. Specs
wire `afterAll(() => kit.close())` so `module.close()` runs every provider's
`onModuleDestroy` hook (including `PrismaService.$disconnect()`).

## Scenarios

Current scenarios (all take a `PrismaService` and return business IDs):

- `givenOrganizationWithOwner` — user + organization + owner membership.
- `givenProjectWithOwner` — above plus project with user attached as owner.
- `givenApiKeyForProject` — above plus a personal API key scoped to the project.

Add a new scenario whenever two or more specs are building the same data
graph inline.

## When to reach for what

| Spec kind | Recommended entry point |
| --- | --- |
| Pure unit (no DB, no Nest) | Plain Jest. No kit, no scenario. |
| Feature command/query handler (DB-backed) | A kit from `kit/`, plus scenarios from `scenarios/`. |
| Transport (REST / GraphQL / MCP) | `createFreshTestApp()` from `e2e/` plus `prepareData` from `utils/prepareProject`. |
| Full app e2e | Same as transport. Keep these few and broad — see `docs/testing-architecture.md`. |
| Invariant test (asserts internal persistence shape) | Primitive factories are fine. Keep the intent explicit in the test name. |
