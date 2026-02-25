# Versioning System — Technical Specification

This document describes the internal versioning system of revisium-core: data model, database schema, invariants, operation rules, and implementation details.

## Data Model

### Entity Hierarchy

```text
Organization
  └── Project
        └── Branch
              ├── Revision (Head)  ──┐
              │                      ├── Table ── Row
              └── Revision (Draft) ──┘
```

### Database Schema

#### Branch

```prisma
model Branch {
  id        String     @id
  createdAt DateTime   @default(now())
  isRoot    Boolean    @default(false)
  name      String
  projectId String
  project   Project    @relation(...)
  revisions Revision[]

  @@unique([name, projectId])
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Primary key |
| `isRoot` | boolean | Default branch of the project |
| `name` | string | User-facing name, unique per project |

#### Revision

```prisma
model Revision {
  id         String   @id
  sequence   Int      @unique @default(autoincrement())
  createdAt  DateTime @default(now())
  comment    String   @default("")
  isHead     Boolean  @default(false)
  isDraft    Boolean  @default(false)
  isStart    Boolean  @default(false)
  hasChanges Boolean  @default(false)
  branchId   String
  branch     Branch     @relation(...)
  parentId   String?
  parent     Revision?  @relation("parentRevision", ...)
  children   Revision[] @relation("parentRevision")
  tables     Table[]
  endpoints  Endpoint[]

  @@index([branchId])
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Primary key |
| `sequence` | int | Global autoincrement, monotonic ordering |
| `comment` | string | Commit message (set on commit) |
| `isHead` | boolean | Pointer: last committed snapshot |
| `isDraft` | boolean | Pointer: working copy |
| `isStart` | boolean | First revision of the branch (root of chain) |
| `hasChanges` | boolean | Draft has uncommitted modifications |
| `parentId` | string? | Previous revision in chain (`null` for first revision) |
| `tables` | Table[] | M:N relation via `_RevisionToTable` |

#### Table

```prisma
model Table {
  versionId String   @id
  createdId String
  id        String
  readonly  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @default(now())
  system    Boolean  @default(false)
  revisions Revision[]
  rows      Row[]

  @@index([id])
}
```

| Field | Type | Description |
|-------|------|-------------|
| `versionId` | string | Primary key, changes on touch (clone) |
| `createdId` | string | Stable identity across versions, never changes |
| `id` | string | User-facing name, changes on rename |
| `readonly` | boolean | Set `true` after commit, triggers copy-on-write |
| `system` | boolean | Internal CMS table (`revisium_schema_table`, `revisium_migration_table`, `revisium_shared_schemas_table`, `revisium_views_table`) |
| `revisions` | Revision[] | M:N — which revisions include this table version |
| `rows` | Row[] | M:N — rows belonging to this table version |

#### Row

```prisma
model Row {
  versionId   String   @id
  createdId   String
  id          String
  readonly    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @default(now())
  publishedAt DateTime @default(now())
  data        Json
  meta        Json     @default("{}")
  hash        String
  schemaHash  String
  tables      Table[]

  @@index([data], type: Gin)
  @@index([id])
}
```

| Field | Type | Description |
|-------|------|-------------|
| `versionId` | string | Primary key, changes on touch (clone) |
| `createdId` | string | Stable identity across versions, never changes |
| `id` | string | User-facing name, changes on rename |
| `readonly` | boolean | Set `true` after commit, triggers copy-on-write |
| `data` | Json | Row payload, GIN-indexed for search |
| `meta` | Json | Metadata (plugin data, etc.) |
| `hash` | string | `object-hash` of `data` field |
| `schemaHash` | string | Hash of schema at time of creation/update |
| `tables` | Table[] | M:N — which table versions contain this row |

### Three-ID System

Tables and Rows use three identifiers:

| Identifier | Uniqueness | Changes When | Purpose |
|------------|------------|--------------|---------|
| `id` | Per revision (table) / per table (row) | Rename operation | User-facing name |
| `versionId` | Global (PK) | Touch/clone from readonly | Identifies specific version |
| `createdId` | Global | Never | Entity identity across versions |

`versionId` changes only on the **first** modification after commit (when `readonly=true` triggers a clone). All subsequent modifications within the same draft use the same `versionId`.

#### Lifecycle Example

```text
Step 1: Create row "product-1" in draft
  id:        "product-1"
  versionId: "aaa"          ← generated
  createdId: "xxx"          ← generated
  readonly:  false

Step 2: Update row data (still in same draft)
  id:        "product-1"    ← same
  versionId: "aaa"          ← SAME (in-place, readonly=false)
  createdId: "xxx"          ← same
  readonly:  false

Step 3: Rename to "item-1"
  id:        "item-1"       ← CHANGED
  versionId: "aaa"          ← same
  createdId: "xxx"          ← same
  readonly:  false

Step 4: Commit → all entities marked readonly=true
  id:        "item-1"
  versionId: "aaa"
  createdId: "xxx"
  readonly:  true            ← LOCKED

Step 5: Update in new draft (touch triggers clone)
  id:        "item-1"       ← same
  versionId: "bbb"          ← NEW (cloned because readonly=true)
  createdId: "xxx"          ← same (identity preserved)
  readonly:  false

Step 6: Update again in same draft
  id:        "item-1"       ← same
  versionId: "bbb"          ← SAME (already touched, readonly=false)
  createdId: "xxx"          ← same
  readonly:  false
```

### Many-to-Many Relations

```sql
-- Revision ←→ Table
CREATE TABLE "_RevisionToTable" (
  "A" TEXT NOT NULL,  -- Revision.id
  "B" TEXT NOT NULL,  -- Table.versionId
  CONSTRAINT "_RevisionToTable_AB_pkey" PRIMARY KEY ("A", "B")
);
CREATE INDEX "_RevisionToTable_B_index" ON "_RevisionToTable"("B");

-- Table ←→ Row
CREATE TABLE "_RowToTable" (
  "A" TEXT NOT NULL,  -- Row.versionId
  "B" TEXT NOT NULL,  -- Table.versionId
  CONSTRAINT "_RowToTable_AB_pkey" PRIMARY KEY ("A", "B")
);
CREATE INDEX "_RowToTable_B_index" ON "_RowToTable"("B");
```

**Why M:N?** The same Table version can be shared across multiple Revisions (when unchanged). The same Row version can be shared across multiple Table versions.

#### Sharing Diagram

```text
Unchanged table — shared between Head and Draft:

  Head R1 ───┐
             ├──── Table "users" v1 ──┬── Row "alice" v1
  Draft R2 ──┘                        └── Row "bob" v1

After modifying Row "bob" in draft (touch creates new versions):

  Head R1 ──── Table "users" v1 ──┬── Row "alice" v1
                                  └── Row "bob" v1

  Draft R2 ─── Table "users" v2 ──┬── Row "alice" v1  ← still shared
                                   └── Row "bob" v2   ← new version
```

### Revision Pointers

Each branch has exactly two pointer revisions at all times:

| Flag | Count per Branch | Description |
|------|-----------------|-------------|
| `isHead=true` | Exactly 1 | Last committed snapshot |
| `isDraft=true` | Exactly 1 | Working copy for modifications |

Revisions form a linked list via `parentId`:

```text
Branch "master"

  R0 (isStart=true)        ← first revision
    ↑ parentId
  R1                        ← historical
    ↑ parentId
  R2 (isHead=true)          ← current head pointer
    ↑ parentId
  R3 (isDraft=true)         ← current draft pointer
```

Draft's parent is always Head.

## Copy-on-Write (Touch)

When modifying data in a draft, the system clones readonly entities to preserve head data.

### Touch Table

```text
touchTable(revisionId, tableId):
  1. Find Table in Revision by tableId
  2. If readonly=false → return as-is (already mutable)
  3. Clone:
     - New versionId
     - Same createdId, id, system, createdAt
     - readonly = false
     - Copy all _RowToTable relations to new version
  4. Disconnect old Table version from Draft Revision
  5. Connect new Table version to Draft Revision
  6. Return new Table
```

```text
BEFORE (shared):
  Head R1 ───┐
             ├── Table v1 (readonly=true) ── rows...
  Draft R2 ──┘

AFTER touchTable:
  Head R1 ──── Table v1 (readonly=true) ── rows...

  Draft R2 ─── Table v2 (readonly=false) ── rows... (same rows, new table version)
```

### Touch Row

```text
touchRow(tableVersionId, rowId):
  1. Find Row in Table by rowId
  2. If readonly=false → return as-is (already mutable)
  3. Clone:
     - New versionId
     - Same createdId, id, data, meta, hash, schemaHash, createdAt, publishedAt
     - readonly = false
  4. Connect new Row to Table
  5. Disconnect old Row from Table
  6. Return new Row
```

```text
BEFORE (Row "bob" shared):
  Table v2 (draft) ──┬── Row "alice" v1 (readonly=true)
                      └── Row "bob" v1 (readonly=true)

AFTER touchRow("bob"):
  Table v2 (draft) ──┬── Row "alice" v1 (readonly=true, still shared)
                      └── Row "bob" v2 (readonly=false, new clone)
```

## Commit Flow

```text
commit(branchId, comment?):
  1. Validate draftRevision.hasChanges = true
  2. Get all table versionIds from Draft
  3. Old Head: set isHead=false, isDraft=false, hasChanges=false
  4. Draft → New Head: set isHead=true, isDraft=false, hasChanges=false, comment
  5. Create New Draft: isDraft=true, parentId=old draft, connect same tables
  6. Lock: UPDATE Table SET readonly=true, UPDATE Row SET readonly=true
  7. Move endpoints: head endpoints → new head, draft endpoints → new draft
```

```text
BEFORE:
  R1 (isHead)           R2 (isDraft, hasChanges=true)
    │                     │
    └── Table v1          └── Table v2

AFTER:
  R1              R2 (isHead)           R3 (isDraft, hasChanges=false)
  (historical)      │                     │
                    └── Table v2 ─────────┘  (shared, readonly=true)
```

Revision chain: `R1 ← R2 ← R3` (via parentId).

## Revert

### Full Revert (Branch-Level)

`revert(branchId)` resets the entire draft to match head:

```text
revert(branchId):
  1. Validate hasChanges = true
  2. Get all table versionIds from Head
  3. Draft.tables = { set: headTables }
  4. Draft.hasChanges = false
```

```text
BEFORE:
  Head R1 ── Table v1 ── Row A v1
  Draft R2 ── Table v2 ── Row A v2 (modified)

AFTER:
  Head R1 ───┐
             ├── Table v1 ── Row A v1  (shared again)
  Draft R2 ──┘

  Orphaned: Table v2, Row A v2 → cleaned up by Cleanup Service
```

### Table Auto-Revert (After Row Removal)

When rows are removed, `recomputeHasChanges` may revert individual tables back to head.

```text
recomputeHasChanges(revisionId, tableId):

  ┌─ Find table in draft revision
  │
  ├─ Table not found? ──→ skip to hasChanges check
  │
  ├─ hasRowDiffs(head, draft)? ──→ YES: table has changes, skip revert
  │
  └─ NO row diffs:
       │
       ├─ Table exists in Head? ──→ YES: revert table to head version
       │     disconnect draft table version
       │     connect head table version
       │
       └─ Table NOT in Head? ──→ SKIP (draft-only table, keep as-is)

  Finally: hasTableDiffs(head, draft)? → set revision.hasChanges accordingly
```

**Rule: Draft-only tables are never auto-reverted.** A table created in the current draft that has no counterpart in head represents an intentional creation. Removing all rows does not undo the table creation.

```text
Table exists in head — reverted after removing all draft changes:

  BEFORE:
    Head R1 ── Table "users" v1 ── Row "alice" v1
    Draft R2 ── Table "users" v2 ── (empty, all rows removed)

  AFTER recomputeHasChanges:
    Head R1 ───┐
               ├── Table "users" v1 ── Row "alice" v1  (shared, reverted)
    Draft R2 ──┘

Table NOT in head — kept in draft even with zero rows:

  BEFORE:
    Head R1 ── (no "orders" table)
    Draft R2 ── Table "orders" v1 ── (empty, all rows removed)

  AFTER recomputeHasChanges:
    Head R1 ── (no "orders" table)
    Draft R2 ── Table "orders" v1 ── (still here, hasChanges=true)
```

## Branch Creation

```text
createBranch(sourceRevisionId, branchName):
  1. Validate: source is NOT a draft (must be committed)
  2. Get all tables from source revision
  3. Create new Branch
  4. Create Head: isHead=true, parentId=sourceRevisionId, connect same tables
  5. Create Draft: isDraft=true, parentId=new head, connect same tables
```

```text
Source (master):
  R1 ← R2 (Head) ← R3 (Draft)
         │
         └── Table v2

createBranch(R2, "feature"):

New (feature):
  R4 (Head) ← R5 (Draft)
    │            │
    └── Table v2 ┘  (shared with master)

  R4.parentId = R2 (cross-branch link to source)
```

## Draft Modification Rules

### Creating Data

| Operation | Steps | Post-action |
|-----------|-------|-------------|
| Create Table | Create new table record, connect to draft revision | `markRevisionAsChanged` |
| Create Rows | Touch table → create row records in table | `markRevisionAsChanged` |

### Modifying Data

| Operation | Steps | Post-action |
|-----------|-------|-------------|
| Update Rows | Touch table → touch row → update data/hash | `markRevisionAsChanged` |
| Rename Rows | Touch table → touch row → update id | `markRevisionAsChanged` |
| Rename Table | Touch table → update id | `markRevisionAsChanged` |

### Removing Data

| Operation | Steps | Post-action |
|-----------|-------|-------------|
| Remove Table | Delete (if `readonly=false`) or disconnect (if `readonly=true`) | `recomputeHasChanges` |
| Remove Rows | Delete non-readonly rows, disconnect readonly rows | `recomputeHasChanges` |

Removal operations call `recomputeHasChanges` instead of `markRevisionAsChanged` because removing data can undo all changes, returning the draft to its head state.

### Row Deletion Strategies

```text
Remove rows from table:

  For each row:
    ├── readonly=false (draft row) → DELETE from database
    └── readonly=true (committed row) → DISCONNECT from table version

BEFORE (removing "bob" which is readonly):
  Table v2 (draft) ──┬── Row "alice" v1 (readonly=true)
                      └── Row "bob" v1 (readonly=true)

AFTER:
  Table v2 (draft) ──── Row "alice" v1

  Row "bob" v1 still exists in Table v1 (head) — preserved for history
```

### Table Deletion Strategies

```text
Remove table from revision:

  ├── readonly=false → DELETE table + DELETE orphaned rows (rows with no other tables)
  └── readonly=true → DISCONNECT table from revision
```

## hasChanges System

`Revision.hasChanges` tracks whether a draft has uncommitted changes.

### markRevisionAsChanged

Idempotent setter:

```sql
UPDATE "Revision" SET "hasChanges" = true WHERE id = ? AND "hasChanges" = false
```

Used after operations that **always** produce changes (create, update, rename).

### recomputeHasChanges

Two-phase check used after removal operations. See flow diagram in [Table Auto-Revert](#table-auto-revert-after-row-removal).

### Change Detection SQL

Row diffs — `hasRowDiffsBetweenRevisions(tableCreatedId, fromRevisionId, toRevisionId)`:

```sql
SELECT EXISTS (
  WITH
    parent_rows AS (
      SELECT "id", "createdId", "versionId" FROM "Row"
      WHERE "versionId" IN (
        -- rows of table with matching createdId in fromRevision
      )
    ),
    child_rows AS (
      SELECT "id", "createdId", "versionId" FROM "Row"
      WHERE "versionId" IN (
        -- rows of table with matching createdId in toRevision
      )
    )
  SELECT 1
  FROM child_rows ct
  FULL OUTER JOIN parent_rows pt USING ("createdId")
  WHERE
    pt."createdId" IS NULL OR            -- row added
    ct."createdId" IS NULL OR            -- row removed
    ct."versionId" != pt."versionId"     -- row modified
  LIMIT 1
)
```

Table diffs — `hasTableDiffsBetweenRevisions(fromRevisionId, toRevisionId)`:

```sql
SELECT EXISTS (
  WITH
    parent_tables AS (
      SELECT "id", "createdId", "versionId" FROM "Table"
      WHERE "versionId" IN (-- tables in fromRevision)
    ),
    child_tables AS (
      SELECT "id", "createdId", "versionId" FROM "Table"
      WHERE "versionId" IN (-- tables in toRevision)
    )
  SELECT 1
  FROM child_tables ct
  FULL OUTER JOIN parent_tables pt USING ("createdId")
  WHERE
    pt."createdId" IS NULL OR            -- table added
    ct."createdId" IS NULL OR            -- table removed
    ct."versionId" != pt."versionId"     -- table modified/renamed
  LIMIT 1
)
```

Both queries use `FULL OUTER JOIN` on `createdId` to detect additions (left-only), removals (right-only), and modifications (different `versionId`).

## Cleanup Service

Orphaned entities (disconnected from all revisions/tables) are cleaned periodically:

```text
@Cron(EVERY_MINUTE)
cleanTablesAndRows():
  1. DELETE FROM "Table" WHERE NOT EXISTS (
       SELECT 1 FROM "_RevisionToTable" WHERE "B" = "Table"."versionId"
     )
  2. DELETE FROM "Row" WHERE NOT EXISTS (
       SELECT 1 FROM "_RowToTable" WHERE "A" = "Row"."versionId"
     )
```

Orphans are created by:
- Revert (draft tables/rows disconnected)
- Touch (old readonly version disconnected from draft)
- Table removal (table disconnected from draft)

Deferred cleanup provides a recovery window and simplifies transaction logic.

## System Tables

Tables with `system=true` are internal CMS tables:

| Table ID | Purpose |
|----------|---------|
| `revisium_schema_table` | JSON Schema definition per user table (one row per table, rowId = tableId) |
| `revisium_migration_table` | Schema migration history |
| `revisium_shared_schemas_table` | Shared schema components across tables |
| `revisium_views_table` | View/filter/sort configurations per table |

System tables follow the same versioning rules (touch, commit, revert) but are hidden from user-facing queries by default (`WHERE system = false`). Use `includeSystem: true` to include them.

## Invariant Summary

| # | Invariant | Enforced By |
|---|-----------|-------------|
| 1 | Exactly one `isHead=true` per branch | Commit handler (flag swap) |
| 2 | Exactly one `isDraft=true` per branch | Commit handler (creates new draft) |
| 3 | `hasChanges=true` only on draft revisions | All modification handlers |
| 4 | Draft-only tables are never auto-reverted | `recomputeHasChanges` (checks `tableInHead`) |
| 5 | Readonly entities require clone before modification | `getOrCreateDraft{Table,Row}` handlers |
| 6 | `createdId` never changes | Generated once, copied on clone |
| 7 | `versionId` changes only on clone (touch) | `getOrCreateDraft{Table,Row}` handlers |
| 8 | Commit requires `hasChanges=true` | Commit validation |
| 9 | Revert requires `hasChanges=true` | Revert validation |
| 10 | All draft operations run in a transaction | `TransactionPrismaService` wrapper |
| 11 | Draft.parentId always points to Head | Commit handler |
| 12 | Committed entities are `readonly=true` | Commit handler (`lockTablesAndRows`) |

## Implementation Files

| Component | File |
|-----------|------|
| Recompute hasChanges | `src/features/draft-revision/commands/handlers/draft-revision-recompute-has-changes.handler.ts` |
| Remove rows | `src/features/draft-revision/commands/handlers/draft-revision-remove-rows.handler.ts` |
| Remove table | `src/features/draft-revision/commands/handlers/draft-revision-remove-table.handler.ts` |
| Touch table | `src/features/draft-revision/commands/handlers/draft-revision-get-or-create-draft-table.handler.ts` |
| Touch row | `src/features/draft-revision/commands/handlers/draft-revision-get-or-create-draft-row.handler.ts` |
| Create table | `src/features/draft-revision/commands/handlers/draft-revision-create-table.handler.ts` |
| Create rows | `src/features/draft-revision/commands/handlers/draft-revision-create-rows.handler.ts` |
| Update rows | `src/features/draft-revision/commands/handlers/draft-revision-update-rows.handler.ts` |
| Rename rows | `src/features/draft-revision/commands/handlers/draft-revision-rename-rows.handler.ts` |
| Rename table | `src/features/draft-revision/commands/handlers/draft-revision-rename-table.handler.ts` |
| Commit | `src/features/draft-revision/commands/handlers/draft-revision-commit.handler.ts` |
| Revert | `src/features/draft-revision/commands/handlers/draft-revision-revert.handler.ts` |
| Row diff SQL | `prisma/sql/hasRowDiffsBetweenRevisions.sql` |
| Table diff SQL | `prisma/sql/hasTableDiffsBetweenRevisions.sql` |
| Diff service | `src/features/share/diff.service.ts` |
| Internal service | `src/features/draft-revision/services/draft-revision-internal.service.ts` |
| Cleanup service | `src/features/share/cleanup.service.ts` |

## Changelog

### 2026-02-25

- Initial document
- Full database schema (Branch, Revision, Table, Row with all fields)
- M:N relation DDL and sharing diagrams
- Copy-on-write (touch) algorithm with before/after diagrams
- Commit flow with pointer movement diagram
- Branch creation flow
- Three-ID lifecycle example
- Row/table deletion strategies with diagrams
- recomputeHasChanges flow diagram with all branches
- Table auto-revert rules (including invariant #4: draft-only tables preserved)
- Cleanup service details
- 12 invariants
