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
          renamedAndModified: 0,
        },
        rowsSummary: {
          total: 0,
          added: 0,
          modified: 0,
          removed: 0,
          renamed: 0,
          renamedAndModified: 0,
        },
        schemaChangesCount: 0,
        dataChangesCount: 0,
      });
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
});
