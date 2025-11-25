import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { GetRevisionChangesHandler } from '../get-revision-changes.handler';
import { GetRevisionChangesQuery } from '../../impl/get-revision-changes.query';
import { DiffService } from 'src/features/share/diff.service';
import { RevisionComparisonService } from '../../../services/revision-comparison.service';

describe('GetRevisionChangesHandler', () => {
  let module: TestingModule;
  let handler: GetRevisionChangesHandler;
  let prismaService: PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule, CqrsModule],
      providers: [
        GetRevisionChangesHandler,
        DiffService,
        RevisionComparisonService,
      ],
    }).compile();

    handler = module.get(GetRevisionChangesHandler);
    prismaService = module.get(PrismaService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('execute', () => {
    it('returns empty stats for revision without parent', async () => {
      const { revision } = await prepareRevisionWithoutParent();

      const result = await handler.execute(
        new GetRevisionChangesQuery({
          revisionId: revision.id,
        }),
      );

      expect(result).toEqual({
        revisionId: revision.id,
        parentRevisionId: null,
        totalChanges: 0,
        tablesSummary: {
          total: 0,
          added: 0,
          modified: 0,
          removed: 0,
          renamed: 0,
        },
        rowsSummary: {
          total: 0,
          added: 0,
          modified: 0,
          removed: 0,
          renamed: 0,
        },
      });
    });

    it('detects and counts renamed and modified changes without double-counting', async () => {
      const { toRevision } = await prepareRenamedAndModifiedChanges();

      const result = await handler.execute(
        new GetRevisionChangesQuery({
          revisionId: toRevision.id,
        }),
      );

      // Tables: 1 renamed+modified, 1 "pure renamed" (becomes renamed+modified due to versionId),
      // 1 pure modified, 1 common table (modified for row changes), 1 added, 1 removed = 6 total
      expect(result.tablesSummary.total).toBe(6);
      // renamed count includes both pure renamed AND renamed+modified (2 + 0 = 2)
      expect(result.tablesSummary.renamed).toBe(2);
      // modified count includes pure modified, common table AND renamed+modified (2 + 2 = 4)
      expect(result.tablesSummary.modified).toBe(4);
      expect(result.tablesSummary.added).toBe(1);
      expect(result.tablesSummary.removed).toBe(1);

      // Rows: 1 renamed+modified (different id AND hash), 1 pure renamed (different id, same hash),
      // 1 pure modified (same id, different hash), 1 added, 1 removed = 5 total
      expect(result.rowsSummary.total).toBe(5);
      // renamed count includes pure renamed AND renamed+modified (1 + 1 = 2)
      expect(result.rowsSummary.renamed).toBe(2);
      // modified count includes pure modified AND renamed+modified (1 + 1 = 2)
      expect(result.rowsSummary.modified).toBe(2);
      expect(result.rowsSummary.added).toBe(1);
      expect(result.rowsSummary.removed).toBe(1);
    });

    it('returns stats for revision with changes', async () => {
      const { fromRevision, toRevision } = await prepareRevisionsWithChanges();

      const result = await handler.execute(
        new GetRevisionChangesQuery({
          revisionId: toRevision.id,
        }),
      );

      expect(result.revisionId).toBe(toRevision.id);
      expect(result.parentRevisionId).toBe(fromRevision.id);
      expect(result.totalChanges).toBeGreaterThan(0);
      expect(result.tablesSummary.total).toBeGreaterThan(0);
    });

    it('compares with specified revision', async () => {
      const { revision1, revision3 } = await prepareMultipleRevisions();

      const result = await handler.execute(
        new GetRevisionChangesQuery({
          revisionId: revision3.id,
          compareWithRevisionId: revision1.id,
        }),
      );

      expect(result.revisionId).toBe(revision3.id);
      expect(result.parentRevisionId).toBe(revision1.id);
    });

    it('excludes system tables by default', async () => {
      const { toRevision } = await prepareRevisionsWithSystemTables();

      const result = await handler.execute(
        new GetRevisionChangesQuery({
          revisionId: toRevision.id,
        }),
      );

      // Should only count regular table
      expect(result.tablesSummary.total).toBe(1);
    });

    it('includes system tables when includeSystem is true', async () => {
      const { toRevision } = await prepareRevisionsWithSystemTables();

      const result = await handler.execute(
        new GetRevisionChangesQuery({
          revisionId: toRevision.id,
          includeSystem: true,
        }),
      );

      // Should count both system and regular tables
      expect(result.tablesSummary.total).toBe(2);
    });

    it('calculates correct stats for complex changes', async () => {
      const { toRevision } = await prepareComplexChanges();

      const result = await handler.execute(
        new GetRevisionChangesQuery({
          revisionId: toRevision.id,
        }),
      );

      expect(result.tablesSummary.added).toBeGreaterThan(0);
      expect(result.tablesSummary.removed).toBeGreaterThan(0);
      expect(result.tablesSummary.modified).toBeGreaterThan(0);
      expect(result.rowsSummary.added).toBeGreaterThan(0);
    });
  });

  // Helper functions
  async function prepareRevisionWithoutParent() {
    const branch = await prismaService.branch.create({
      data: {
        id: nanoid(),
        name: nanoid(),
        project: {
          create: {
            id: nanoid(),
            name: nanoid(),
            organization: {
              create: {
                id: nanoid(),
                createdId: nanoid(),
              },
            },
          },
        },
      },
    });

    const revision = await prismaService.revision.create({
      data: {
        id: nanoid(),
        branch: {
          connect: { id: branch.id },
        },
      },
    });

    return { revision };
  }

  async function prepareRevisionsWithChanges() {
    const branch = await prismaService.branch.create({
      data: {
        id: nanoid(),
        name: nanoid(),
        project: {
          create: {
            id: nanoid(),
            name: nanoid(),
            organization: {
              create: {
                id: nanoid(),
                createdId: nanoid(),
              },
            },
          },
        },
      },
    });

    const fromRevision = await prismaService.revision.create({
      data: {
        id: nanoid(),
        branchId: branch.id,
      },
    });

    const toRevision = await prismaService.revision.create({
      data: {
        id: nanoid(),
        parentId: fromRevision.id,
        branchId: branch.id,
      },
    });

    // Add a table change
    await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    return { fromRevision, toRevision };
  }

  async function prepareMultipleRevisions() {
    const branch = await prismaService.branch.create({
      data: {
        id: nanoid(),
        name: nanoid(),
        project: {
          create: {
            id: nanoid(),
            name: nanoid(),
            organization: {
              create: {
                id: nanoid(),
                createdId: nanoid(),
              },
            },
          },
        },
      },
    });

    const revision1 = await prismaService.revision.create({
      data: {
        id: nanoid(),
        branchId: branch.id,
      },
    });

    const revision2 = await prismaService.revision.create({
      data: {
        id: nanoid(),
        parentId: revision1.id,
        branchId: branch.id,
      },
    });

    const revision3 = await prismaService.revision.create({
      data: {
        id: nanoid(),
        parentId: revision2.id,
        branchId: branch.id,
      },
    });

    return { revision1, revision2, revision3 };
  }

  async function prepareRevisionsWithSystemTables() {
    const branch = await prismaService.branch.create({
      data: {
        id: nanoid(),
        name: nanoid(),
        project: {
          create: {
            id: nanoid(),
            name: nanoid(),
            organization: {
              create: {
                id: nanoid(),
                createdId: nanoid(),
              },
            },
          },
        },
      },
    });

    const fromRevision = await prismaService.revision.create({
      data: {
        id: nanoid(),
        branchId: branch.id,
      },
    });

    const toRevision = await prismaService.revision.create({
      data: {
        id: nanoid(),
        parentId: fromRevision.id,
        branchId: branch.id,
      },
    });

    // Add system table
    await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        system: true,
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    // Add regular table
    await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        system: false,
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    return { fromRevision, toRevision };
  }

  async function prepareComplexChanges() {
    const branch = await prismaService.branch.create({
      data: {
        id: nanoid(),
        name: nanoid(),
        project: {
          create: {
            id: nanoid(),
            name: nanoid(),
            organization: {
              create: {
                id: nanoid(),
                createdId: nanoid(),
              },
            },
          },
        },
      },
    });

    const fromRevision = await prismaService.revision.create({
      data: {
        id: nanoid(),
        branchId: branch.id,
      },
    });

    const toRevision = await prismaService.revision.create({
      data: {
        id: nanoid(),
        parentId: fromRevision.id,
        branchId: branch.id,
      },
    });

    // Added table
    const addedTable = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    // Removed table
    await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: { id: fromRevision.id },
        },
      },
    });

    // Modified table
    const fromTable = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: { id: fromRevision.id },
        },
      },
    });

    await prismaService.table.create({
      data: {
        id: fromTable.id,
        createdId: fromTable.createdId,
        versionId: nanoid(),
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    // Add row to the added table
    await prismaService.row.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        tables: {
          connect: { versionId: addedTable.versionId },
        },
        data: { name: 'test' },
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    return { fromRevision, toRevision };
  }

  async function prepareRenamedAndModifiedChanges() {
    const branch = await prismaService.branch.create({
      data: {
        id: nanoid(),
        name: nanoid(),
        project: {
          create: {
            id: nanoid(),
            name: nanoid(),
            organization: {
              create: {
                id: nanoid(),
                createdId: nanoid(),
              },
            },
          },
        },
      },
    });

    const fromRevision = await prismaService.revision.create({
      data: {
        id: nanoid(),
        branchId: branch.id,
      },
    });

    const toRevision = await prismaService.revision.create({
      data: {
        id: nanoid(),
        parentId: fromRevision.id,
        branchId: branch.id,
      },
    });

    // TABLE CHANGES
    // 1. Added table
    const addedTable = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    // 2. Removed table
    await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: { id: fromRevision.id },
        },
      },
    });

    // 3. Pure modified table (same id, different versionId)
    const modifiedTable = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: { id: fromRevision.id },
        },
      },
    });

    await prismaService.table.create({
      data: {
        id: modifiedTable.id, // Same id
        createdId: modifiedTable.createdId,
        versionId: nanoid(), // Different versionId = modified
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    // 4. Renamed and modified table (different id AND different versionId)
    const renamedAndModifiedTable = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: { id: fromRevision.id },
        },
      },
    });

    await prismaService.table.create({
      data: {
        id: nanoid(), // Different id = renamed
        createdId: renamedAndModifiedTable.createdId,
        versionId: nanoid(), // Different versionId = modified
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    // 5. "Pure renamed" table (different id, but different versionId too due to constraint)
    // This will actually be counted as renamed+modified because versionId must be unique
    const renamedTable = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: { id: fromRevision.id },
        },
      },
    });

    await prismaService.table.create({
      data: {
        id: nanoid(), // Different id = renamed
        createdId: renamedTable.createdId,
        versionId: nanoid(), // Must be different due to unique constraint
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    // We need a table for row changes that exists in both revisions
    const commonTableFrom = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: { id: fromRevision.id },
        },
      },
    });

    const commonTableTo = await prismaService.table.create({
      data: {
        id: commonTableFrom.id,
        createdId: commonTableFrom.createdId,
        versionId: nanoid(),
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    // ROW CHANGES
    // 1. Added row
    await prismaService.row.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        tables: {
          connect: { versionId: addedTable.versionId },
        },
        data: { value: 'added' },
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    // 2. Removed row (exists in fromRevision, not in toRevision)
    await prismaService.row.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        tables: {
          connect: { versionId: commonTableFrom.versionId },
        },
        data: { value: 'removed' },
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    // 3. Pure modified row (same id, different hash)
    const sameRowId = nanoid();
    const sameRowCreatedId = nanoid();

    await prismaService.row.create({
      data: {
        id: sameRowId,
        createdId: sameRowCreatedId,
        versionId: nanoid(),
        tables: {
          connect: { versionId: commonTableFrom.versionId },
        },
        data: { value: 'old' },
        hash: 'hash1',
        schemaHash: 'schema1',
      },
    });

    await prismaService.row.create({
      data: {
        id: sameRowId, // Same id
        createdId: sameRowCreatedId,
        versionId: nanoid(),
        tables: {
          connect: { versionId: commonTableTo.versionId },
        },
        data: { value: 'new' },
        hash: 'hash2', // Different hash = modified
        schemaHash: 'schema1',
      },
    });

    // 4. Pure renamed row (different id, same hash)
    const renamedRowCreatedId = nanoid();
    const sameHash = 'sameHash123';
    const sameSchemaHash = 'sameSchemaHash456';
    const sameData = { value: 'unchanged' };

    await prismaService.row.create({
      data: {
        id: nanoid(),
        createdId: renamedRowCreatedId,
        versionId: nanoid(),
        tables: {
          connect: { versionId: commonTableFrom.versionId },
        },
        data: sameData,
        hash: sameHash, // Same hash
        schemaHash: sameSchemaHash,
      },
    });

    await prismaService.row.create({
      data: {
        id: nanoid(), // Different id = renamed
        createdId: renamedRowCreatedId,
        versionId: nanoid(),
        tables: {
          connect: { versionId: commonTableTo.versionId },
        },
        data: sameData,
        hash: sameHash, // Same hash = not modified
        schemaHash: sameSchemaHash,
      },
    });

    // 5. Renamed AND modified row (different id AND different hash)
    const renamedModifiedCreatedId = nanoid();

    await prismaService.row.create({
      data: {
        id: nanoid(),
        createdId: renamedModifiedCreatedId,
        versionId: nanoid(),
        tables: {
          connect: { versionId: commonTableFrom.versionId },
        },
        data: { value: 'before' },
        hash: 'hashA',
        schemaHash: 'schemaA',
      },
    });

    await prismaService.row.create({
      data: {
        id: nanoid(), // Different id = renamed
        createdId: renamedModifiedCreatedId,
        versionId: nanoid(),
        tables: {
          connect: { versionId: commonTableTo.versionId },
        },
        data: { value: 'after' },
        hash: 'hashB', // Different hash = modified
        schemaHash: 'schemaA',
      },
    });

    return { fromRevision, toRevision };
  }
});
