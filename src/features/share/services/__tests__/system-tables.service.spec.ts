import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { SystemTablesService } from 'src/features/share/system-tables.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('SystemTablesService', () => {
  describe('ensureSystemTable', () => {
    it('should create system table with system: true', async () => {
      const { draftRevisionId } = await prepareProject(prismaService);

      await runTransaction(async () => {
        const result = await systemTablesService.ensureSystemTable(
          draftRevisionId,
          SystemTables.Views,
        );

        expect(result.system).toBe(true);
      });

      const table = await prismaService.table.findFirst({
        where: {
          id: SystemTables.Views,
          revisions: {
            some: {
              id: draftRevisionId,
            },
          },
        },
      });

      expect(table).toBeDefined();
      expect(table?.system).toBe(true);
    });

    it('should return existing table if already created', async () => {
      const { draftRevisionId } = await prepareProject(prismaService);

      // Create first time
      const firstResult = await runTransaction(async () => {
        return systemTablesService.ensureSystemTable(
          draftRevisionId,
          SystemTables.Views,
        );
      });

      // Call again
      const secondResult = await runTransaction(async () => {
        return systemTablesService.ensureSystemTable(
          draftRevisionId,
          SystemTables.Views,
        );
      });

      expect(secondResult.versionId).toBe(firstResult.versionId);
      expect(secondResult.system).toBe(true);
    });

    it('should NOT create row in revisium_schema_table for system table', async () => {
      const { draftRevisionId } = await prepareProject(prismaService);

      await runTransaction(async () => {
        await systemTablesService.ensureSystemTable(
          draftRevisionId,
          SystemTables.Views,
        );
      });

      const schemaTable = await prismaService.table.findFirst({
        where: {
          id: SystemTables.Schema,
          revisions: { some: { id: draftRevisionId } },
        },
      });

      expect(schemaTable).toBeDefined();

      const schemaRow = await prismaService.row.findFirst({
        where: {
          id: SystemTables.Views,
          tables: { some: { versionId: schemaTable!.versionId } },
        },
      });

      expect(schemaRow).toBeNull();
    });

    it('should not appear in tables query (system tables filtered)', async () => {
      const { draftRevisionId } = await prepareProject(prismaService);

      // Create views system table
      await runTransaction(async () => {
        await systemTablesService.ensureSystemTable(
          draftRevisionId,
          SystemTables.Views,
        );
      });

      // Query non-system tables
      const tables = await prismaService.table.findMany({
        where: {
          system: false,
          revisions: {
            some: {
              id: draftRevisionId,
            },
          },
        },
      });

      const viewsTable = tables.find((t) => t.id === SystemTables.Views);
      expect(viewsTable).toBeUndefined();
    });
  });

  function runTransaction<T>(fn: () => Promise<T>): Promise<T> {
    return transactionService.run(fn);
  }

  let prismaService: PrismaService;
  let transactionService: TransactionPrismaService;
  let systemTablesService: SystemTablesService;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    transactionService = result.transactionService;
    systemTablesService = result.module.get(SystemTablesService);
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
