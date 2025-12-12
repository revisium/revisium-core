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
import { ViewsComparisonService } from '../../../services/views-comparison.service';
import { TableChangeMapper } from '../../../mappers/table-change.mapper';
import { ChangeType, MigrationType } from '../../../types';
import { SystemTables } from 'src/features/share/system-tables.consts';

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
        ViewsComparisonService,
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

    it('handles renamed and modified table correctly', async () => {
      const { toRevision, fromTable, toTable } = await prepareRenamedTable();

      const result = await handler.execute(
        new GetTableChangesQuery({
          revisionId: toRevision.id,
          first: 10,
        }),
      );

      expect(result.edges.length).toBe(1);
      const change = result.edges[0].node;
      expect(change.changeType).toBe(ChangeType.RenamedAndModified);
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

    it('filters by changeTypes', async () => {
      const { toRevision, addedTable } = await prepareTableChanges();

      const result = await handler.execute(
        new GetTableChangesQuery({
          revisionId: toRevision.id,
          first: 10,
          filters: {
            changeTypes: [ChangeType.Added],
          },
        }),
      );

      result.edges.forEach((edge) => {
        expect(edge.node.changeType).toBe(ChangeType.Added);
      });
      expect(result.edges.length).toBeGreaterThan(0);

      const addedChange = result.edges.find(
        (e) => e.node.tableCreatedId === addedTable.createdId,
      );
      expect(addedChange).toBeDefined();
    });

    it('filters by multiple changeTypes', async () => {
      const { toRevision } = await prepareTableChanges();

      const result = await handler.execute(
        new GetTableChangesQuery({
          revisionId: toRevision.id,
          first: 10,
          filters: {
            changeTypes: [ChangeType.Added, ChangeType.Modified],
          },
        }),
      );

      result.edges.forEach((edge) => {
        expect([ChangeType.Added, ChangeType.Modified]).toContain(
          edge.node.changeType,
        );
      });
      expect(result.edges.length).toBeGreaterThan(0);
    });

    it('returns schemaMigrations for tables with migrations', async () => {
      const { toRevision, addedTable } = await prepareTableWithMigration();

      const result = await handler.execute(
        new GetTableChangesQuery({
          revisionId: toRevision.id,
          first: 10,
        }),
      );

      const tableChange = result.edges.find(
        (e) => e.node.tableCreatedId === addedTable.createdId,
      );
      expect(tableChange).toBeDefined();
      expect(tableChange?.node.schemaMigrations).toHaveLength(1);
      expect(tableChange?.node.schemaMigrations[0]).toMatchObject({
        migrationType: MigrationType.Init,
      });
    });

    it('returns viewsChanges with no changes when no views exist', async () => {
      const { toRevision, addedTable } = await prepareTableChanges();

      const result = await handler.execute(
        new GetTableChangesQuery({
          revisionId: toRevision.id,
          first: 10,
        }),
      );

      const tableChange = result.edges.find(
        (e) => e.node.tableCreatedId === addedTable.createdId,
      );
      expect(tableChange).toBeDefined();
      expect(tableChange?.node.viewsChanges).toBeDefined();
      expect(tableChange?.node.viewsChanges.hasChanges).toBe(false);
      expect(tableChange?.node.viewsChanges.changes).toEqual([]);
      expect(tableChange?.node.viewsChanges.addedCount).toBe(0);
      expect(tableChange?.node.viewsChanges.modifiedCount).toBe(0);
      expect(tableChange?.node.viewsChanges.removedCount).toBe(0);
      expect(tableChange?.node.viewsChanges.renamedCount).toBe(0);
    });

    it('returns viewsChanges with added views', async () => {
      const { toRevision, addedTable } = await prepareTableWithViews();

      const result = await handler.execute(
        new GetTableChangesQuery({
          revisionId: toRevision.id,
          first: 10,
        }),
      );

      const tableChange = result.edges.find(
        (e) => e.node.tableCreatedId === addedTable.createdId,
      );
      expect(tableChange).toBeDefined();
      expect(tableChange?.node.viewsChanges.hasChanges).toBe(true);
      expect(tableChange?.node.viewsChanges.changes).toHaveLength(2);
      expect(tableChange?.node.viewsChanges.addedCount).toBe(2);
      expect(tableChange?.node.viewsChanges.changes[0].viewId).toBe('default');
      expect(tableChange?.node.viewsChanges.changes[0].changeType).toBe(
        ChangeType.Added,
      );
      expect(tableChange?.node.viewsChanges.changes[1].viewId).toBe('custom');
      expect(tableChange?.node.viewsChanges.changes[1].changeType).toBe(
        ChangeType.Added,
      );
    });

    it('returns viewsChanges with modified views', async () => {
      const { toRevision, modifiedTable } =
        await prepareTableWithModifiedViews();

      const result = await handler.execute(
        new GetTableChangesQuery({
          revisionId: toRevision.id,
          first: 10,
        }),
      );

      const tableChange = result.edges.find(
        (e) => e.node.tableCreatedId === modifiedTable.createdId,
      );
      expect(tableChange).toBeDefined();
      expect(tableChange?.node.viewsChanges.hasChanges).toBe(true);
      expect(tableChange?.node.viewsChanges.modifiedCount).toBe(1);
      expect(tableChange?.node.viewsChanges.changes[0].viewId).toBe('default');
      expect(tableChange?.node.viewsChanges.changes[0].changeType).toBe(
        ChangeType.Modified,
      );
    });

    it('returns viewsChanges with removed views', async () => {
      const { toRevision, modifiedTable } =
        await prepareTableWithRemovedViews();

      const result = await handler.execute(
        new GetTableChangesQuery({
          revisionId: toRevision.id,
          first: 10,
        }),
      );

      const tableChange = result.edges.find(
        (e) => e.node.tableCreatedId === modifiedTable.createdId,
      );
      expect(tableChange).toBeDefined();
      expect(tableChange?.node.viewsChanges.hasChanges).toBe(true);
      expect(tableChange?.node.viewsChanges.removedCount).toBe(1);
      expect(tableChange?.node.viewsChanges.changes[0].viewId).toBe('custom');
      expect(tableChange?.node.viewsChanges.changes[0].changeType).toBe(
        ChangeType.Removed,
      );
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
        id: nanoid(), // Different id (renamed)
        createdId: fromTable.createdId, // Same createdId
        versionId: nanoid(), // Different versionId (modified)
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

  async function prepareTableWithMigration() {
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

    // Create migration table in fromRevision
    const fromMigrationTable = await prismaService.table.create({
      data: {
        id: SystemTables.Migration,
        createdId: nanoid(),
        versionId: nanoid(),
        system: true,
        readonly: true,
        revisions: {
          connect: { id: fromRevision.id },
        },
      },
    });

    const toRevision = await prismaService.revision.create({
      data: {
        id: nanoid(),
        parentId: fromRevision.id,
        branchId: branch.id,
      },
    });

    // Create new version of migration table for toRevision
    const toMigrationTable = await prismaService.table.create({
      data: {
        id: SystemTables.Migration,
        createdId: fromMigrationTable.createdId,
        versionId: nanoid(),
        system: true,
        readonly: true,
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    // Create a table that will have a migration
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

    // Create migration row for the added table
    // Migration stores human-readable tableId, not createdId
    const migrationData = {
      id: nanoid(),
      tableId: addedTable.id,
      changeType: 'init',
    };

    await prismaService.row.create({
      data: {
        id: migrationData.id,
        createdId: nanoid(),
        versionId: nanoid(),
        publishedAt: new Date(),
        tables: {
          connect: { versionId: toMigrationTable.versionId },
        },
        data: migrationData,
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    return { fromRevision, toRevision, addedTable, migrationData };
  }

  async function prepareTableWithViews() {
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

    // Create user table
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

    // Create views system table in toRevision
    const viewsTable = await prismaService.table.create({
      data: {
        id: SystemTables.Views,
        createdId: nanoid(),
        versionId: nanoid(),
        system: true,
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    // Create views row for the user table with 2 views
    await prismaService.row.create({
      data: {
        id: addedTable.id,
        createdId: nanoid(),
        versionId: nanoid(),
        tables: {
          connect: { versionId: viewsTable.versionId },
        },
        data: {
          version: 1,
          defaultViewId: 'default',
          views: [
            { id: 'default', name: 'Default', columns: null },
            { id: 'custom', name: 'Custom View', columns: [{ field: 'id' }] },
          ],
        },
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    return { fromRevision, toRevision, addedTable };
  }

  async function prepareTableWithModifiedViews() {
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

    // Create table in both revisions
    const tableCreatedId = nanoid();
    const tableId = nanoid();

    const fromTable = await prismaService.table.create({
      data: {
        id: tableId,
        createdId: tableCreatedId,
        versionId: nanoid(),
        revisions: {
          connect: { id: fromRevision.id },
        },
      },
    });

    const modifiedTable = await prismaService.table.create({
      data: {
        id: tableId,
        createdId: tableCreatedId,
        versionId: nanoid(),
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    // Create views system table in fromRevision
    const fromViewsTableCreatedId = nanoid();
    const fromViewsTable = await prismaService.table.create({
      data: {
        id: SystemTables.Views,
        createdId: fromViewsTableCreatedId,
        versionId: nanoid(),
        system: true,
        revisions: {
          connect: { id: fromRevision.id },
        },
      },
    });

    // Create views row for fromRevision
    await prismaService.row.create({
      data: {
        id: tableId,
        createdId: nanoid(),
        versionId: nanoid(),
        tables: {
          connect: { versionId: fromViewsTable.versionId },
        },
        data: {
          version: 1,
          defaultViewId: 'default',
          views: [{ id: 'default', name: 'Default', columns: null }],
        },
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    // Create views system table in toRevision
    const toViewsTable = await prismaService.table.create({
      data: {
        id: SystemTables.Views,
        createdId: fromViewsTableCreatedId,
        versionId: nanoid(),
        system: true,
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    // Create modified views row for toRevision
    await prismaService.row.create({
      data: {
        id: tableId,
        createdId: nanoid(),
        versionId: nanoid(),
        tables: {
          connect: { versionId: toViewsTable.versionId },
        },
        data: {
          version: 1,
          defaultViewId: 'default',
          views: [
            {
              id: 'default',
              name: 'Default',
              columns: [{ field: 'id', width: 200 }],
            },
          ],
        },
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    return { fromRevision, toRevision, fromTable, modifiedTable };
  }

  async function prepareTableWithRemovedViews() {
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

    // Create table in both revisions
    const tableCreatedId = nanoid();
    const tableId = nanoid();

    const fromTable = await prismaService.table.create({
      data: {
        id: tableId,
        createdId: tableCreatedId,
        versionId: nanoid(),
        revisions: {
          connect: { id: fromRevision.id },
        },
      },
    });

    const modifiedTable = await prismaService.table.create({
      data: {
        id: tableId,
        createdId: tableCreatedId,
        versionId: nanoid(),
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    // Create views system table in fromRevision
    const fromViewsTableCreatedId = nanoid();
    const fromViewsTable = await prismaService.table.create({
      data: {
        id: SystemTables.Views,
        createdId: fromViewsTableCreatedId,
        versionId: nanoid(),
        system: true,
        revisions: {
          connect: { id: fromRevision.id },
        },
      },
    });

    // Create views row for fromRevision with 2 views
    await prismaService.row.create({
      data: {
        id: tableId,
        createdId: nanoid(),
        versionId: nanoid(),
        tables: {
          connect: { versionId: fromViewsTable.versionId },
        },
        data: {
          version: 1,
          defaultViewId: 'default',
          views: [
            { id: 'default', name: 'Default', columns: null },
            { id: 'custom', name: 'Custom', columns: [{ field: 'id' }] },
          ],
        },
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    // Create views system table in toRevision
    const toViewsTable = await prismaService.table.create({
      data: {
        id: SystemTables.Views,
        createdId: fromViewsTableCreatedId,
        versionId: nanoid(),
        system: true,
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    // Create views row for toRevision with 1 view (custom view removed)
    await prismaService.row.create({
      data: {
        id: tableId,
        createdId: nanoid(),
        versionId: nanoid(),
        tables: {
          connect: { versionId: toViewsTable.versionId },
        },
        data: {
          version: 1,
          defaultViewId: 'default',
          views: [{ id: 'default', name: 'Default', columns: null }],
        },
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    return { fromRevision, toRevision, fromTable, modifiedTable };
  }
});
