import { CommandBus } from '@nestjs/cqrs';
import {
  getNumberSchema,
  getObjectSchema,
  getStringSchema,
} from '@revisium/schema-toolkit/mocks';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { ApiCreateTableCommand } from 'src/features/draft/commands/impl/api-create-table.command';
import { RemoveTableCommand } from 'src/features/draft/commands/impl/remove-table.command';
import { UpdateTableCommand } from 'src/features/draft/commands/impl/update-table.command';
import { RowApiService } from 'src/features/row/row-api.service';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { InMemoryBentoCache } from 'src/infrastructure/cache/handlers/__tests__/in-memory-bento-cache';
import { CACHE_SERVICE } from 'src/infrastructure/cache/services/cache.tokens';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('Schema table cache invalidation on table operations (e2e)', () => {
  describe('create table', () => {
    it('should invalidate revisium_schema_table getRows cache after creating a new table', async () => {
      const { draftRevisionId } = await prepareProject(prismaService);

      // 1. Cache getRows for revisium_schema_table
      const schemaRowsBefore = await rowApiService.getRows({
        revisionId: draftRevisionId,
        tableId: SystemTables.Schema,
        first: 100,
      });
      const countBefore = schemaRowsBefore.totalCount;

      // 2. Create a new table
      await commandBus.execute(
        new ApiCreateTableCommand({
          revisionId: draftRevisionId,
          tableId: 'NewTable',
          schema: getObjectSchema({ name: getNumberSchema() }),
        }),
      );

      // 3. getRows must reflect the new schema row
      const schemaRowsAfter = await rowApiService.getRows({
        revisionId: draftRevisionId,
        tableId: SystemTables.Schema,
        first: 100,
      });
      expect(schemaRowsAfter.totalCount).toBe(countBefore + 1);
    });
  });

  describe('update table', () => {
    it('should invalidate revisium_schema_table row cache after updating table schema', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);

      // 1. Cache the schema row for the table
      const schemaRowBefore = await rowApiService.getRow({
        revisionId: draftRevisionId,
        tableId: SystemTables.Schema,
        rowId: tableId,
      });
      expect(schemaRowBefore).not.toBeNull();
      expect(schemaRowBefore?.data).not.toHaveProperty('properties.extra');

      // 2. Update table schema — add a new field
      await runTransaction(
        new UpdateTableCommand({
          revisionId: draftRevisionId,
          tableId,
          patches: [
            {
              op: 'add',
              path: '/properties/extra',
              value: getStringSchema(),
            },
          ],
        }),
      );

      // 3. Schema row must reflect the update
      const schemaRowAfter = await rowApiService.getRow({
        revisionId: draftRevisionId,
        tableId: SystemTables.Schema,
        rowId: tableId,
      });
      expect(schemaRowAfter).not.toBeNull();
      expect(schemaRowAfter?.data).toHaveProperty('properties.extra');
    });
  });

  describe('delete table', () => {
    it('should invalidate revisium_schema_table getRows cache after deleting a table', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);

      // 1. Cache getRows for revisium_schema_table
      const schemaRowsBefore = await rowApiService.getRows({
        revisionId: draftRevisionId,
        tableId: SystemTables.Schema,
        first: 100,
      });
      const countBefore = schemaRowsBefore.totalCount;
      expect(countBefore).toBeGreaterThan(0);

      // 2. Delete the table
      await runTransaction(
        new RemoveTableCommand({
          revisionId: draftRevisionId,
          tableId,
        }),
      );

      // 3. getRows must reflect the removal
      const schemaRowsAfter = await rowApiService.getRows({
        revisionId: draftRevisionId,
        tableId: SystemTables.Schema,
        first: 100,
      });
      expect(schemaRowsAfter.totalCount).toBe(countBefore - 1);
    });
  });

  function runTransaction<T>(command: unknown): Promise<T> {
    return transactionService.run(async () =>
      commandBus.execute(command as any),
    );
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;
  let rowApiService: RowApiService;

  beforeAll(async () => {
    const result = await createTestingModule({
      overrides: (builder) => {
        builder
          .overrideProvider(CACHE_SERVICE)
          .useValue(new InMemoryBentoCache());
      },
    });
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
    rowApiService = result.module.get<RowApiService>(RowApiService);
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
