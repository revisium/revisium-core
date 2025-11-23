import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { GetRowChangesHandler } from '../get-row-changes.handler';
import { GetRowChangesQuery } from '../../impl/get-row-changes.query';
import { RowDiffService } from '../../../services/row-diff.service';
import { SchemaImpactService } from '../../../services/schema-impact.service';
import { RevisionComparisonService } from '../../../services/revision-comparison.service';
import { RowChangeMapper } from '../../../mappers/row-change.mapper';
import { ChangeType } from '../../../types';

describe('GetRowChangesHandler', () => {
  let module: TestingModule;
  let handler: GetRowChangesHandler;
  let prismaService: PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule, CqrsModule],
      providers: [
        GetRowChangesHandler,
        RowDiffService,
        SchemaImpactService,
        RevisionComparisonService,
        RowChangeMapper,
      ],
    }).compile();

    handler = module.get(GetRowChangesHandler);
    prismaService = module.get(PrismaService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('execute', () => {
    it('returns empty result for revision without parent', async () => {
      const { revision } = await prepareRevisionWithoutParent();

      const result = await handler.execute(
        new GetRowChangesQuery({
          revisionId: revision.id,
          first: 10,
        }),
      );

      expect(result.edges).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
    });

    it('returns row changes with correct change types', async () => {
      const { toRevision, addedRow } = await prepareRowChanges();

      const result = await handler.execute(
        new GetRowChangesQuery({
          revisionId: toRevision.id,
          first: 10,
        }),
      );

      expect(result.edges.length).toBeGreaterThan(0);
      expect(result.totalCount).toBeGreaterThan(0);

      const addedChange = result.edges.find(
        (e) => e.node.rowCreatedId === addedRow.createdId,
      );
      expect(addedChange?.node.changeType).toBe(ChangeType.Added);
    });

    it('filters by tableId', async () => {
      const { toRevision, table1 } = await prepareMultipleTables();

      const result = await handler.execute(
        new GetRowChangesQuery({
          revisionId: toRevision.id,
          first: 10,
          filters: {
            tableId: table1.createdId,
          },
        }),
      );

      // Should only return rows from table1
      result.edges.forEach((edge) => {
        expect(edge.node.tableCreatedId).toBe(table1.createdId);
      });
    });

    it('filters by tableCreatedId', async () => {
      const { toRevision, table1 } = await prepareMultipleTables();

      const result = await handler.execute(
        new GetRowChangesQuery({
          revisionId: toRevision.id,
          first: 10,
          filters: {
            tableCreatedId: table1.createdId,
          },
        }),
      );

      // Should only return rows from table1
      result.edges.forEach((edge) => {
        expect(edge.node.tableCreatedId).toBe(table1.createdId);
      });
    });

    it('searches by rowId', async () => {
      const { toRevision, searchRow } = await prepareRowsWithSearch();

      const result = await handler.execute(
        new GetRowChangesQuery({
          revisionId: toRevision.id,
          first: 10,
          filters: {
            search: searchRow.id.substring(0, 5),
          },
        }),
      );

      expect(result.edges.length).toBeGreaterThan(0);
      const found = result.edges.find((e) => e.node.rowId === searchRow.id);
      expect(found).toBeDefined();
    });

    it('handles pagination correctly', async () => {
      const { toRevision } = await prepareMultipleRows();

      const page1 = await handler.execute(
        new GetRowChangesQuery({
          revisionId: toRevision.id,
          first: 2,
        }),
      );

      expect(page1.edges.length).toBe(2);
      expect(page1.pageInfo.hasNextPage).toBe(true);

      const page2 = await handler.execute(
        new GetRowChangesQuery({
          revisionId: toRevision.id,
          first: 2,
          after: page1.edges[page1.edges.length - 1].cursor,
        }),
      );

      expect(page2.edges.length).toBeGreaterThan(0);
    });

    it('excludes system tables by default', async () => {
      const { toRevision } = await prepareRowsInSystemTable();

      const result = await handler.execute(
        new GetRowChangesQuery({
          revisionId: toRevision.id,
          first: 10,
        }),
      );

      // Should only return rows from regular table
      expect(result.totalCount).toBe(1);
    });

    it('includes system tables when includeSystem is true', async () => {
      const { toRevision } = await prepareRowsInSystemTable();

      const result = await handler.execute(
        new GetRowChangesQuery({
          revisionId: toRevision.id,
          first: 10,
          filters: {
            includeSystem: true,
          },
        }),
      );

      // Should return rows from both system and regular tables
      expect(result.totalCount).toBe(2);
    });

    it('handles renamed rows correctly', async () => {
      const { toRevision, fromRow, toRow } = await prepareRenamedRow();

      const result = await handler.execute(
        new GetRowChangesQuery({
          revisionId: toRevision.id,
          first: 10,
        }),
      );

      expect(result.edges.length).toBe(1);
      const change = result.edges[0].node;
      expect(change.changeType).toBe(ChangeType.Renamed);
      expect(change.oldRowId).toBe(fromRow.id);
      expect(change.newRowId).toBe(toRow.id);
    });

    it('includes field changes in result', async () => {
      const { toRevision } = await prepareModifiedRow();

      const result = await handler.execute(
        new GetRowChangesQuery({
          revisionId: toRevision.id,
          first: 10,
        }),
      );

      expect(result.edges.length).toBeGreaterThan(0);
      const change = result.edges[0].node;
      expect(change.fieldChanges).toBeDefined();
      expect(Array.isArray(change.fieldChanges)).toBe(true);
    });

    it('includes tableId in result', async () => {
      const { toRevision, table } = await prepareRowChanges();

      const result = await handler.execute(
        new GetRowChangesQuery({
          revisionId: toRevision.id,
          first: 10,
        }),
      );

      expect(result.edges.length).toBeGreaterThan(0);
      const change = result.edges[0].node;
      expect(change.tableId).toBeDefined();
      expect(change.tableCreatedId).toBe(table.createdId);
    });

    it('compares with specified revision', async () => {
      const { revision1, revision3 } = await prepareMultipleRevisions();

      const result = await handler.execute(
        new GetRowChangesQuery({
          revisionId: revision3.id,
          compareWithRevisionId: revision1.id,
          first: 10,
        }),
      );

      // Should compare revision3 with revision1
      expect(result).toBeDefined();
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

  async function prepareRowChanges() {
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
        id: fromTable.id,
        createdId: fromTable.createdId,
        versionId: nanoid(),
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    // Added row (only in toRevision)
    const addedRow = await prismaService.row.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        tables: {
          connect: { versionId: toTable.versionId },
        },
        data: { name: 'test' },
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    return { fromRevision, toRevision, table: toTable, addedRow };
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

    const table1CreatedId = nanoid();
    const table2CreatedId = nanoid();

    const fromTable1 = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: table1CreatedId,
        versionId: nanoid(),
        revisions: {
          connect: { id: fromRevision.id },
        },
      },
    });

    const toTable1 = await prismaService.table.create({
      data: {
        id: fromTable1.id,
        createdId: table1CreatedId,
        versionId: nanoid(),
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    const fromTable2 = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: table2CreatedId,
        versionId: nanoid(),
        revisions: {
          connect: { id: fromRevision.id },
        },
      },
    });

    const toTable2 = await prismaService.table.create({
      data: {
        id: fromTable2.id,
        createdId: table2CreatedId,
        versionId: nanoid(),
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    // Add row to table1 (only in toRevision)
    await prismaService.row.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        tables: {
          connect: { versionId: toTable1.versionId },
        },
        data: { name: 'table1' },
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    // Add row to table2 (only in toRevision)
    await prismaService.row.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        tables: {
          connect: { versionId: toTable2.versionId },
        },
        data: { name: 'table2' },
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    return { fromRevision, toRevision, table1: toTable1, table2: toTable2 };
  }

  async function prepareRowsWithSearch() {
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

    const tableCreatedId = nanoid();

    const fromTable = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: tableCreatedId,
        versionId: nanoid(),
        revisions: {
          connect: { id: fromRevision.id },
        },
      },
    });

    const toTable = await prismaService.table.create({
      data: {
        id: fromTable.id,
        createdId: tableCreatedId,
        versionId: nanoid(),
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    const searchRow = await prismaService.row.create({
      data: {
        id: 'search-test-' + nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        tables: {
          connect: { versionId: toTable.versionId },
        },
        data: { name: 'searchable' },
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    return { fromRevision, toRevision, table: toTable, searchRow };
  }

  async function prepareMultipleRows() {
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

    const tableCreatedId = nanoid();

    const fromTable = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: tableCreatedId,
        versionId: nanoid(),
        revisions: {
          connect: { id: fromRevision.id },
        },
      },
    });

    const toTable = await prismaService.table.create({
      data: {
        id: fromTable.id,
        createdId: tableCreatedId,
        versionId: nanoid(),
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    // Create 5 rows (only in toRevision)
    for (let i = 0; i < 5; i++) {
      await prismaService.row.create({
        data: {
          id: nanoid(),
          createdId: nanoid(),
          versionId: nanoid(),
          tables: {
            connect: { versionId: toTable.versionId },
          },
          data: { name: `row${i}` },
          hash: nanoid(),
          schemaHash: nanoid(),
        },
      });
    }

    return { fromRevision, toRevision, table: toTable };
  }

  async function prepareRowsInSystemTable() {
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

    const systemTableCreatedId = nanoid();
    const regularTableCreatedId = nanoid();

    const fromSystemTable = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: systemTableCreatedId,
        versionId: nanoid(),
        system: true,
        revisions: {
          connect: { id: fromRevision.id },
        },
      },
    });

    const toSystemTable = await prismaService.table.create({
      data: {
        id: fromSystemTable.id,
        createdId: systemTableCreatedId,
        versionId: nanoid(),
        system: true,
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    const fromRegularTable = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: regularTableCreatedId,
        versionId: nanoid(),
        system: false,
        revisions: {
          connect: { id: fromRevision.id },
        },
      },
    });

    const toRegularTable = await prismaService.table.create({
      data: {
        id: fromRegularTable.id,
        createdId: regularTableCreatedId,
        versionId: nanoid(),
        system: false,
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    // Add row to system table (only in toRevision)
    await prismaService.row.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        tables: {
          connect: { versionId: toSystemTable.versionId },
        },
        data: { name: 'system' },
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    // Add row to regular table (only in toRevision)
    await prismaService.row.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        tables: {
          connect: { versionId: toRegularTable.versionId },
        },
        data: { name: 'regular' },
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    return {
      fromRevision,
      toRevision,
      systemTable: toSystemTable,
      regularTable: toRegularTable,
    };
  }

  async function prepareRenamedRow() {
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
        id: fromTable.id,
        createdId: fromTable.createdId,
        versionId: nanoid(),
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    const fromRow = await prismaService.row.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        tables: {
          connect: { versionId: fromTable.versionId },
        },
        data: { name: 'old' },
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    const toRow = await prismaService.row.create({
      data: {
        id: nanoid(), // Different id
        createdId: fromRow.createdId, // Same createdId
        versionId: nanoid(),
        tables: {
          connect: { versionId: toTable.versionId },
        },
        data: { name: 'new' },
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    return { fromRevision, toRevision, fromRow, toRow };
  }

  async function prepareModifiedRow() {
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
        id: fromTable.id,
        createdId: fromTable.createdId,
        versionId: nanoid(),
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    const rowCreatedId = nanoid();

    await prismaService.row.create({
      data: {
        id: nanoid(),
        createdId: rowCreatedId,
        versionId: nanoid(),
        tables: {
          connect: { versionId: fromTable.versionId },
        },
        data: { name: 'old value' },
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    await prismaService.row.create({
      data: {
        id: nanoid(),
        createdId: rowCreatedId,
        versionId: nanoid(),
        tables: {
          connect: { versionId: toTable.versionId },
        },
        data: { name: 'new value' },
        hash: nanoid(),
        schemaHash: nanoid(),
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

    const table1 = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: [
            { id: revision1.id },
            { id: revision2.id },
            { id: revision3.id },
          ],
        },
      },
    });

    // Add a row in revision3
    await prismaService.row.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        tables: {
          connect: { versionId: table1.versionId },
        },
        data: { name: 'test' },
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    return { revision1, revision2, revision3 };
  }
});
