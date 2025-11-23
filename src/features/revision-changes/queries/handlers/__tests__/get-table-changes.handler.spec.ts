import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { GetTableChangesHandler } from '../get-table-changes.handler';
import { GetTableChangesQuery } from '../../impl/get-table-changes.query';
import { DiffService } from 'src/features/share/diff.service';
import { SchemaImpactService } from '../../../services/schema-impact.service';
import { RevisionComparisonService } from '../../../services/revision-comparison.service';
import { TableChangeMapper } from '../../../mappers/table-change.mapper';
import { ChangeType } from '../../../types';

describe('GetTableChangesHandler', () => {
  let module: TestingModule;
  let handler: GetTableChangesHandler;
  let prismaService: PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule, CqrsModule],
      providers: [
        GetTableChangesHandler,
        DiffService,
        SchemaImpactService,
        RevisionComparisonService,
        TableChangeMapper,
      ],
    }).compile();

    handler = module.get(GetTableChangesHandler);
    prismaService = module.get(PrismaService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('execute', () => {
    it('returns empty result for revision without parent', async () => {
      const { revision } = await prepareRevisionWithoutParent();

      const result = await handler.execute(
        new GetTableChangesQuery({
          revisionId: revision.id,
          first: 10,
        }),
      );

      expect(result.edges).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
    });

    it('returns table changes with correct change types', async () => {
      const { toRevision, addedTable } = await prepareTableChanges();

      const result = await handler.execute(
        new GetTableChangesQuery({
          revisionId: toRevision.id,
          first: 10,
        }),
      );

      expect(result.edges.length).toBeGreaterThan(0);
      expect(result.totalCount).toBeGreaterThan(0);

      const addedChange = result.edges.find(
        (e) => e.node.tableCreatedId === addedTable.createdId,
      );
      expect(addedChange?.node.changeType).toBe(ChangeType.Added);
    });

    it('handles pagination correctly', async () => {
      const { toRevision } = await prepareMultipleTables();

      const page1 = await handler.execute(
        new GetTableChangesQuery({
          revisionId: toRevision.id,
          first: 2,
        }),
      );

      expect(page1.edges.length).toBe(2);
      expect(page1.pageInfo.hasNextPage).toBe(true);

      const page2 = await handler.execute(
        new GetTableChangesQuery({
          revisionId: toRevision.id,
          first: 2,
          after: page1.edges[page1.edges.length - 1].cursor,
        }),
      );

      expect(page2.edges.length).toBeGreaterThan(0);
    });

    it('excludes system tables by default', async () => {
      const { toRevision } = await prepareTablesWithSystem();

      const result = await handler.execute(
        new GetTableChangesQuery({
          revisionId: toRevision.id,
          first: 10,
        }),
      );

      // Should only return regular table
      expect(result.totalCount).toBe(1);
    });

    it('includes system tables when includeSystem is true', async () => {
      const { toRevision } = await prepareTablesWithSystem();

      const result = await handler.execute(
        new GetTableChangesQuery({
          revisionId: toRevision.id,
          first: 10,
          filters: {
            includeSystem: true,
          },
        }),
      );

      // Should return both system and regular tables
      expect(result.totalCount).toBe(2);
    });

    it('handles renamed table correctly', async () => {
      const { toRevision, fromTable, toTable } = await prepareRenamedTable();

      const result = await handler.execute(
        new GetTableChangesQuery({
          revisionId: toRevision.id,
          first: 10,
        }),
      );

      expect(result.edges.length).toBe(1);
      const change = result.edges[0].node;
      expect(change.changeType).toBe(ChangeType.Renamed);
      expect(change.oldTableId).toBe(fromTable.id);
      expect(change.newTableId).toBe(toTable.id);
    });

    it('compares with specified revision', async () => {
      const { revision1, revision3 } = await prepareMultipleRevisions();

      const result = await handler.execute(
        new GetTableChangesQuery({
          revisionId: revision3.id,
          compareWithRevisionId: revision1.id,
          first: 10,
        }),
      );

      // Should compare revision3 with revision1, not with parent
      expect(result).toBeDefined();
    });

    it('includes row counts for each table', async () => {
      const { toRevision } = await prepareTableWithRows();

      const result = await handler.execute(
        new GetTableChangesQuery({
          revisionId: toRevision.id,
          first: 10,
        }),
      );

      expect(result.edges.length).toBeGreaterThan(0);
      const tableChange = result.edges[0].node;
      expect(tableChange.rowChangesCount).toBeDefined();
      expect(tableChange.addedRowsCount).toBeDefined();
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
        branchId: branch.id,
      },
    });

    return { revision };
  }

  async function prepareTableChanges() {
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

    const modifiedTable = await prismaService.table.create({
      data: {
        id: fromTable.id,
        createdId: fromTable.createdId,
        versionId: nanoid(),
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    return { fromRevision, toRevision, addedTable, modifiedTable };
  }

  async function prepareMultipleTables() {
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

    // Create 5 tables
    for (let i = 0; i < 5; i++) {
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
    }

    return { fromRevision, toRevision };
  }

  async function prepareTablesWithSystem() {
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

    // System table
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

    // Regular table
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

  async function prepareRenamedTable() {
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

    const toTable = await prismaService.table.create({
      data: {
        id: nanoid(), // Different id
        createdId: fromTable.createdId, // Same createdId
        versionId: nanoid(),
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    return { fromRevision, toRevision, fromTable, toTable };
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

    // Add a table in revision3
    await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: { id: revision3.id },
        },
      },
    });

    return { revision1, revision2, revision3 };
  }

  async function prepareTableWithRows() {
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

    const table = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    // Add rows to table
    await prismaService.row.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        tables: {
          connect: { versionId: table.versionId },
        },
        data: { name: 'test' },
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    return { fromRevision, toRevision, table };
  }
});
