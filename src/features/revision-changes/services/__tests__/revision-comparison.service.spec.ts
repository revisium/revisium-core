import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { RevisionComparisonService } from '../revision-comparison.service';
import { SystemTables } from 'src/features/share/system-tables.consts';

describe('RevisionComparisonService', () => {
  let module: TestingModule;
  let service: RevisionComparisonService;
  let prismaService: PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [RevisionComparisonService],
    }).compile();

    service = module.get(RevisionComparisonService);
    prismaService = module.get(PrismaService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('getMigrationsForTable', () => {
    it('should return migrations from the migration table for a specific table', async () => {
      // Setup
      const { revision, table, migrationData } = await prepareMigrationData();

      // Execute
      const result = await service.getMigrationsForTable(
        revision.id,
        table.createdId,
      );

      // Validate
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: migrationData.id,
        tableId: table.id,
        changeType: migrationData.changeType,
      });
    });

    it('should return empty array when no migrations exist for table', async () => {
      const { revision } = await prepareRevisionWithMigrationTable();
      const nonExistentTableCreatedId = nanoid();

      const result = await service.getMigrationsForTable(
        revision.id,
        nonExistentTableCreatedId,
      );

      expect(result).toEqual([]);
    });

    it('should return multiple migrations for the same table ordered by publishedAt desc', async () => {
      const { revision, table, migrations } = await prepareMultipleMigrations();

      const result = await service.getMigrationsForTable(
        revision.id,
        table.createdId,
      );

      expect(result).toHaveLength(2);
      // Should be ordered by publishedAt desc
      expect((result[0] as any).id).toBe(migrations[1].id);
      expect((result[1] as any).id).toBe(migrations[0].id);
    });
  });

  describe('getMigrationsForTableBetweenRevisions', () => {
    it('should return only new migrations between revisions', async () => {
      const { fromRevision, toRevision, table, newMigration } =
        await prepareMigrationsBetweenRevisions();

      const result = await service.getMigrationsForTableBetweenRevisions(
        fromRevision.id,
        toRevision.id,
        table.createdId,
      );

      expect(result).toHaveLength(1);
      expect((result[0] as any).id).toBe(newMigration.id);
    });

    it('should return empty array when no new migrations exist', async () => {
      const { fromRevision, toRevision, table } = await prepareSameMigrations();

      const result = await service.getMigrationsForTableBetweenRevisions(
        fromRevision.id,
        toRevision.id,
        table.createdId,
      );

      expect(result).toEqual([]);
    });
  });

  // Helper functions
  async function createBranchAndProject() {
    return prismaService.branch.create({
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
  }

  async function createMigrationTable(revisionId: string) {
    return prismaService.table.create({
      data: {
        id: SystemTables.Migration,
        createdId: nanoid(),
        versionId: nanoid(),
        system: true,
        readonly: true,
        revisions: {
          connect: { id: revisionId },
        },
      },
    });
  }

  async function createTable(revisionId: string, tableId: string) {
    return prismaService.table.create({
      data: {
        id: tableId,
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: { id: revisionId },
        },
      },
    });
  }

  async function prepareMigrationData() {
    const branch = await createBranchAndProject();

    const revision = await prismaService.revision.create({
      data: {
        id: nanoid(),
        branchId: branch.id,
      },
    });

    const migrationTable = await createMigrationTable(revision.id);
    const table = await createTable(revision.id, 'test-table');

    const migrationData = {
      id: nanoid(),
      tableId: table.id,
      changeType: 'init',
    };

    await prismaService.row.create({
      data: {
        id: migrationData.id,
        createdId: nanoid(),
        versionId: nanoid(),
        publishedAt: new Date(),
        tables: {
          connect: { versionId: migrationTable.versionId },
        },
        data: migrationData,
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    return { revision, table, migrationData, migrationTable };
  }

  async function prepareRevisionWithMigrationTable() {
    const branch = await createBranchAndProject();

    const revision = await prismaService.revision.create({
      data: {
        id: nanoid(),
        branchId: branch.id,
      },
    });

    await createMigrationTable(revision.id);

    return { revision };
  }

  async function prepareMultipleMigrations() {
    const branch = await createBranchAndProject();

    const revision = await prismaService.revision.create({
      data: {
        id: nanoid(),
        branchId: branch.id,
      },
    });

    const migrationTable = await createMigrationTable(revision.id);
    const table = await createTable(revision.id, 'test-table');
    const now = new Date();

    const migrations = [
      { id: nanoid(), tableId: table.id, changeType: 'init' },
      { id: nanoid(), tableId: table.id, changeType: 'update' },
    ];

    // Create first migration (earlier)
    await prismaService.row.create({
      data: {
        id: migrations[0].id,
        createdId: nanoid(),
        versionId: nanoid(),
        publishedAt: new Date(now.getTime() - 1000),
        tables: {
          connect: { versionId: migrationTable.versionId },
        },
        data: migrations[0],
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    // Create second migration (later)
    await prismaService.row.create({
      data: {
        id: migrations[1].id,
        createdId: nanoid(),
        versionId: nanoid(),
        publishedAt: now,
        tables: {
          connect: { versionId: migrationTable.versionId },
        },
        data: migrations[1],
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    return { revision, table, migrations };
  }

  async function prepareMigrationsBetweenRevisions() {
    const branch = await createBranchAndProject();

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

    const fromMigrationTable = await createMigrationTable(fromRevision.id);
    const table = await createTable(fromRevision.id, 'test-table');

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

    // Connect table to toRevision as well
    const toTable = await prismaService.table.create({
      data: {
        id: table.id,
        createdId: table.createdId,
        versionId: nanoid(),
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    const now = new Date();

    const existingMigration = {
      id: nanoid(),
      tableId: table.id,
      changeType: 'init',
    };

    const newMigration = {
      id: nanoid(),
      tableId: table.id,
      changeType: 'update',
    };

    // Create existing migration in fromRevision
    const existingMigrationRow = await prismaService.row.create({
      data: {
        id: existingMigration.id,
        createdId: nanoid(),
        versionId: nanoid(),
        publishedAt: new Date(now.getTime() - 1000),
        tables: {
          connect: { versionId: fromMigrationTable.versionId },
        },
        data: existingMigration,
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    // Connect existing migration to toRevision's migration table as well
    await prismaService.row.update({
      where: { versionId: existingMigrationRow.versionId },
      data: {
        tables: {
          connect: { versionId: toMigrationTable.versionId },
        },
      },
    });

    // Create new migration only in toRevision
    await prismaService.row.create({
      data: {
        id: newMigration.id,
        createdId: nanoid(),
        versionId: nanoid(),
        publishedAt: now,
        tables: {
          connect: { versionId: toMigrationTable.versionId },
        },
        data: newMigration,
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    return {
      fromRevision,
      toRevision,
      table: toTable,
      existingMigration,
      newMigration,
    };
  }

  async function prepareSameMigrations() {
    const branch = await createBranchAndProject();

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

    const fromMigrationTable = await createMigrationTable(fromRevision.id);
    const table = await createTable(fromRevision.id, 'test-table');

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

    // Connect table to toRevision
    const toTable = await prismaService.table.create({
      data: {
        id: table.id,
        createdId: table.createdId,
        versionId: nanoid(),
        revisions: {
          connect: { id: toRevision.id },
        },
      },
    });

    const migration = {
      id: nanoid(),
      tableId: table.id,
      changeType: 'init',
    };

    // Create migration and connect to both revisions
    const migrationRow = await prismaService.row.create({
      data: {
        id: migration.id,
        createdId: nanoid(),
        versionId: nanoid(),
        publishedAt: new Date(),
        tables: {
          connect: { versionId: fromMigrationTable.versionId },
        },
        data: migration,
        hash: nanoid(),
        schemaHash: nanoid(),
      },
    });

    await prismaService.row.update({
      where: { versionId: migrationRow.versionId },
      data: {
        tables: {
          connect: { versionId: toMigrationTable.versionId },
        },
      },
    });

    return { fromRevision, toRevision, table: toTable };
  }
});
