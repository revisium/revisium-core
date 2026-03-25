import { CommandBus } from '@nestjs/cqrs';
import {
  getNumberSchema,
  getObjectSchema,
} from '@revisium/schema-toolkit/mocks';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { RemoveTableCommand } from 'src/features/draft/commands/impl/remove-table.command';
import { UpdateTableCommand } from 'src/features/draft/commands/impl/update-table.command';
import { RowApiService } from 'src/features/row/row-api.service';
import { InMemoryBentoCache } from 'src/infrastructure/cache/handlers/__tests__/in-memory-bento-cache';
import { CACHE_SERVICE } from 'src/infrastructure/cache/services/cache.tokens';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('Table cache invalidation (e2e)', () => {
  describe('TableDeletedEventHandler', () => {
    it('should invalidate row cache after table deletion', async () => {
      const { draftRevisionId, tableId, rowId } =
        await prepareProject(prismaService);

      // 1. Cache the row
      const rowBefore = await rowApiService.getRow({
        revisionId: draftRevisionId,
        tableId,
        rowId,
      });
      expect(rowBefore).not.toBeNull();

      // 2. Delete the table
      await runTransaction(
        new RemoveTableCommand({
          revisionId: draftRevisionId,
          tableId,
        }),
      );

      // 3. getRow must return null, not cached data
      const rowAfter = await rowApiService.getRow({
        revisionId: draftRevisionId,
        tableId,
        rowId,
      });
      expect(rowAfter).toBeNull();
    });

    it('should invalidate getRows cache after table deletion', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);

      // 1. Cache getRows
      const rowsBefore = await rowApiService.getRows({
        revisionId: draftRevisionId,
        tableId,
        first: 100,
      });
      expect(rowsBefore.totalCount).toBe(1);

      // 2. Delete the table
      await runTransaction(
        new RemoveTableCommand({
          revisionId: draftRevisionId,
          tableId,
        }),
      );

      // 3. getRows must not return cached result — table no longer exists
      await expect(
        rowApiService.getRows({
          revisionId: draftRevisionId,
          tableId,
          first: 100,
        }),
      ).rejects.toThrow('A table with this name does not exist');
    });
  });

  describe('TableSchemaUpdatedEventHandler', () => {
    it('should invalidate row cache after schema update', async () => {
      const { draftRevisionId, tableId, rowId } =
        await prepareProject(prismaService);

      // 1. Cache the row
      const rowBefore = await rowApiService.getRow({
        revisionId: draftRevisionId,
        tableId,
        rowId,
      });
      expect(rowBefore).not.toBeNull();
      expect(rowBefore?.data).toEqual({ ver: 2 });

      // 2. Update schema — add a new field
      const newSchema = getObjectSchema({
        ver: getNumberSchema(),
        extra: getNumberSchema(),
      });
      await runTransaction(
        new UpdateTableCommand({
          revisionId: draftRevisionId,
          tableId,
          patches: [
            {
              op: 'add',
              path: '/properties/extra',
              value: newSchema.properties!.extra,
            },
          ],
        }),
      );

      // 3. getRow must return fresh data reflecting schema change
      const rowAfter = await rowApiService.getRow({
        revisionId: draftRevisionId,
        tableId,
        rowId,
      });
      expect(rowAfter).not.toBeNull();
      // Row should have the new field with default value
      expect(rowAfter?.data).toHaveProperty('extra');
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
