# Testing Architecture

## Purpose

This document defines the target test architecture for `revisium-core`.

The goal is to keep real Prisma-backed integration coverage while making the suite:

- easier to read
- easier to extend
- more consistent in abstraction level
- cheaper to evolve feature-by-feature

`revisium-core` is broader than `revisium-engine`: it contains domain features,
transport layers, auth, billing boundaries, and app-level integration points.
Because of that, the target architecture is layered rather than uniform.

Shared test support should live outside `__tests__`.
Only test files themselves should stay in `*.spec.ts`, `*.test.ts`, or feature-local
`__tests__` folders.

## Principles

### Meaningful reading order first

A test file should show behavior before plumbing.

Preferred order:

1. imports
2. constants and schemas that define the business context
3. `describe` and `it` blocks
4. shared assertion helpers
5. scenario/setup helpers
6. lifecycle and teardown details if they can live lower in the file

### Tests are executable specifications

Tests should read in business terms when the subject is business behavior.

The reader should understand:

- what is prepared
- what action is taken
- what result is expected

without tracing low-level storage setup in the test body.

### Behavior tests and invariant tests

Both styles are valid, but they should be honest about what they verify.

Behavior tests:

- dominant style for feature and API coverage
- focus on observable results
- prefer scenario helpers and focused assertions

Invariant tests:

- verify internal guarantees that are themselves the subject
- may inspect internal rows, version ids, or system records directly
- should keep that internal intent explicit in the test name and assertions

### Real database first

Feature integration tests should continue using the real Prisma layer.
The refactor is about structure and setup boundaries, not replacing meaningful
integration coverage with mocks.

### One abstraction level per test

Avoid mixing these in one test body:

- domain intent
- Nest module wiring
- transaction plumbing
- internal persistence mechanics

Move repeated wiring into shared kits. Move repeated data graphs into named
scenario helpers. Keep direct low-level setup only when the test is explicitly
about that low-level detail.

### Smallest module that proves the behavior

Use the lightest test module that still exercises the subject honestly.

- unit tests: no database, mock collaborators where appropriate
- feature integration tests: minimal Nest module + real Prisma
- transport tests: resolver/controller module or bounded API fixture
- app e2e: full app bootstrap only for true cross-feature flows

## Target Layers

### 1. Unit tests

Use for pure helpers, validation-only services, mapping utilities, and other code
that does not need the database or Nest runtime.

Examples in `revisium-core`:

- DTO transform helpers
- schema utilities
- auth helpers with isolated collaborators

### 2. Feature integration tests

This should be the dominant layer for command handlers, query handlers, and
database-backed services.

Target shape:

- start from a shared feature test kit
- prepare state with scenario helpers such as `givenDraftRevision`
- execute the handler/service through a narrow public boundary
- assert observable persistence effects or explicit invariants

Examples:

- `draft-revision` handlers
- project and organization command handlers
- API key services
- storage-backed feature services where the database remains part of the subject

### 3. Transport-layer integration tests

Resolver, controller, and MCP endpoint tests should verify transport behavior
without rebuilding more of the app than necessary.

Examples:

- GraphQL resolver tests
- REST controller tests
- MCP request/URI handling tests

Use focused fixtures for auth context, request helpers, and seeded data instead of
embedding full app setup in each file.

### 4. End-to-end tests

Keep these fewer and broader.

They should validate:

- main auth flows
- major API paths
- cross-module integration that cannot be proven at a narrower layer

`src/__tests__/e2e` should remain the place for those app-sized tests rather than
becoming the default for feature work.

## Shared Building Blocks

### Test kits

Shared kits should provide the smallest reusable Nest module for a feature area.

Examples of the direction we want:

- `src/testing/kit/createDraftRevisionCommandTestKit`
- future kits for project commands, auth flows, API key features, and bounded API slices

Kits should own:

- module composition
- common provider overrides
- transaction helper methods
- teardown through `module.close()`

### Scenario helpers

Scenario helpers should describe business setup, not storage mechanics.

Preferred names:

- `givenDraftRevision`
- `givenProjectWithOwner`
- `givenAuthenticatedAdmin`

Primitive helpers can still exist, but they should support scenarios rather than
be the default entrypoint.

Placement rule:

- shared kits go in `src/testing/kit`
- shared scenarios go in `src/testing/scenarios`
- shared factories/fixtures go in `src/testing/factories`, `src/testing/plugin`, or a feature-specific `src/testing/<area>` folder
- shared assertions/flows can go in `src/testing/assertions` or `src/testing/helpers`
- shared e2e support goes in `src/testing/e2e`
- feature-local `__tests__` folders should contain specs only

### Assertion and flow helpers

Shared helpers should absorb repeated operational detail:

- auth request setup
- GraphQL request helpers
- common database assertions
- polling/waiting for async feature work when needed

## Auth / permission matrix tests

Auth and permission rules are shared across transports (REST, GraphQL, and later
MCP) but enforced by separate guards and resolvers. The same rule can drift
silently between transports when tested twice, so auth coverage follows a single
shared pattern.

### Goal

Describe each endpoint's auth contract once and run it against every transport
it is exposed on.

### Layers

Four layers, each replaceable in isolation:

- **Operation** — what is being called, per transport. An operation defines a
  `rest` and/or `gql` call signature taking a typed params object. An operation
  may declare only one transport when the endpoint is transport-exclusive.
- **Actor** — who is calling. Current kit exports:
  - `actors.anonymous()` — no token.
  - `actors.fromToken(token, label?)` — wrap an arbitrary token.
  - `actors.owner(fixture)` / `actors.crossOwner(fixture)` — resolve the
    owner / anotherOwner tokens out of a `prepareData`-backed fixture.
  - `actors.resolveRole(fixture, role)` — dispatch a `'owner' | 'crossOwner'
    | 'anonymous'` matrix row to the right helper.
  - `actors.admin(app)` — seed a systemAdmin on demand for admin endpoints.

  Actors return a transport-agnostic `{ token, label? }` bundle. Richer
  variants (`actors.user({ orgRole, inOrg, projectRole? })`,
  `actors.apiKey({ scopes, readOnly, ... })`) land when the first spec
  actually needs them.
- **Outcome** — what correct means, normalized per transport:
  `unauthorized`, `forbidden`, `not_found`, `allowed`. REST status codes and
  GraphQL `errors[0].extensions.code` are mapped inside the kit. Tests never
  branch on transport.
- **Matrix** — `describe.each(op.transports)` over `it.each(cases)`. Rows
  describe *actor → expected* in business terms.

### Kit location

- kit code: `src/testing/kit/auth-permission/`
- test files: co-located with the subject as `*.auth.e2e.spec.ts`
- one shared spec per feature when both REST and GraphQL expose the operation,
  transport-exclusive spec when only one transport does

No shared support files under `__tests__`; imports go to
`src/testing/kit/auth-permission/*` (consistent with the rule above).

### Customization

Transport coverage is not uniform. The kit must express that honestly:

- **Endpoint exists on one transport only** — omit the missing transport on the
  operation. The matrix auto-skips it. No `describe.skip` needed.
- **Rule differs by transport** — add `transports: ['rest']` or `['gql']` to a
  row. Rows without `transports:` run on all transports the operation supports.
  Asymmetric rules stay explicit at the row level, not hidden in setup.
- **Outcome differs by transport** — two rows with different `expected` and
  disjoint `transports:`. Link an ADR when the asymmetry is intentional.
- **Content assertions on the `allowed` path** — per-transport `assert:`
  callbacks on a row. Only run when `expected === 'allowed'`. Never attach
  content assertions to forbidden/not_found rows; content leakage lives in a
  separate spec.
- **Per-row extras** — extend `AuthMatrixCaseBase` with extra columns via
  intersection (e.g. `AuthMatrixCaseBase & { project: 'private' | 'public' }`)
  and branch inside the `build(c)` callback. Keeps asymmetric inputs explicit
  at the row level, not hidden in setup.

### When this kit is not a fit

- CASL ability rules → `casl-ability-factory.spec.ts`
- Guard scope resolution → `permission-guard-scope.spec.ts`
- Request-body / DTO validation → dedicated DTO specs
- Multi-step business flows → regular feature integration or e2e tests

The kit verifies that the decision is wired to every transport correctly. It is
not a replacement for unit-testing the decision itself.

### Example shape

```ts
// src/api/__tests__/project/update-project.auth.e2e.spec.ts
import { gql } from 'src/testing/utils/gql';
import {
  booleanMutationAssert,
  operation,
  runAuthMatrix,
  PROJECT_MUTATION_MATRIX,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

const updateProject = operation<{
  organizationId: string;
  projectName: string;
  isPublic: boolean;
}>({
  id: 'project.update',
  rest: {
    method: 'put',
    url: ({ organizationId, projectName }) =>
      `/api/organization/${organizationId}/projects/${projectName}`,
    body: ({ isPublic }) => ({ isPublic }),
  },
  gql: {
    query: gql`
      mutation updateProject($data: UpdateProjectInput!) {
        updateProject(data: $data)
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

describe('update project auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: updateProject,
    cases: PROJECT_MUTATION_MATRIX,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        organizationId: fresh.fixture.project.organizationId,
        projectName: fresh.fixture.project.projectName,
        isPublic: true,
      },
      assert: booleanMutationAssert('updateProject'),
    }),
  });
});
```

The `runAuthMatrix` helper wraps
`describe.each(op.transports).it.each(cases)` and dispatches through
`actors.resolveRole(fixture, c.role)` internally; specs declare intent
(operation + matrix + per-case params/assert), not the plumbing.

Matrix presets shipped with the kit:

- `PROJECT_MUTATION_MATRIX` / `ORG_MUTATION_MATRIX` — owner allowed,
  cross-owner forbidden, anon unauthorized.
- `PROJECT_VISIBILITY_MATRIX` — 6 cases: private × {owner, crossOwner,
  anon} + public × {owner, crossOwner, anon}. For readonly endpoints
  whose public-project path grants anon read.
- `PROJECT_PII_READ_MATRIX` — same shape as the mutation matrix; used
  for sub-resources (user lists, keys) where private/public visibility
  does not relax membership.

When none of these fit, declare an explicit `AuthMatrixCaseBase[]`
inline and point `runAuthMatrix`'s `cases` at it.

### Migration from current supertest/GraphQL specs

Current e2e specs (`endpoint-by-id.controller.spec.ts`, `api-key.e2e.spec.ts`,
`branch.resolver.spec.ts`, and similar) already use `createFreshTestApp` and
`prepareData`. Migration is mechanical:

1. Identify the auth-only cases: those whose only assertion is a status code
   plus the auth header.
2. Extract them into a new `*.auth.e2e.spec.ts` using the matrix form.
3. Leave content-level assertions in the original spec. Those specs become
   smaller and focused on business behavior.
4. When REST and GraphQL cover the same policy, merge into one shared spec that
   fans out over both transports.

## Current Direction

Two parallel refactor slices:

- `draft-revision` handler specs — feature-integration kit pattern
- auth/permission matrix — transport-layer pattern, introducing
  `src/testing/kit/auth-permission/`

Why these two first:

- many tests rebuild the same Nest module
- the current setup is primitive-heavy
- auth rules duplicated between REST and GraphQL specs risk silent drift
- both areas are central enough to establish naming and boundaries for later suites

The intended steady state is:

- new DB-backed feature tests start from shared kits and scenarios by default
- new auth tests go through the auth-permission matrix from the start
- old tests are migrated opportunistically when touched
- direct low-level setup stays only where it makes the subject clearer

Current repo rule:

- no shared support files live under `__tests__`
- imports should point to `src/testing/*`, not to test-folder-local helper files
