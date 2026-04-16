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
- `givenApiKeyForProject`
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

## Current Direction

The first refactor slice is `draft-revision` handler specs.

Why this area first:

- many tests rebuild the same Nest module
- the current setup is primitive-heavy
- the feature is central enough to establish naming and boundaries for later suites

The intended steady state is:

- new DB-backed feature tests start from shared kits and scenarios by default
- old tests are migrated opportunistically when touched
- direct low-level setup stays only where it makes the subject clearer

Current repo rule:

- no shared support files live under `__tests__`
- imports should point to `src/testing/*`, not to test-folder-local helper files
