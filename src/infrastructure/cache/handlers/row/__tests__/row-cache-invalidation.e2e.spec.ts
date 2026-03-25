import { CommandBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { ApiCreateRowCommand } from 'src/features/draft/commands/impl/api-create-row.command';
import { ApiUpdateRowCommand } from 'src/features/draft/commands/impl/api-update-row.command';
import { ApiRemoveRowCommand } from 'src/features/draft/commands/impl/api-remove-row.command';
import { ApiRemoveRowsCommand } from 'src/features/draft/commands/impl/api-remove-rows.command';
import { RowApiService } from 'src/features/row/row-api.service';
import { InMemoryBentoCache } from 'src/infrastructure/cache/handlers/__tests__/in-memory-bento-cache';
import { CACHE_SERVICE } from 'src/infrastructure/cache/services/cache.tokens';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('Row cache invalidation (e2e)', () => {
  describe('RowCreatedEventHandler', () => {
    it('should invalidate getRows cache after creating a row', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);

      // 1. Cache getRows result (1 row from prepareProject)
      const rowsBefore = await rowApiService.getRows({
        revisionId: draftRevisionId,
        tableId,
        first: 100,
      });
      expect(rowsBefore.totalCount).toBe(1);

      // 2. Create a new row
      await runTransaction(
        new ApiCreateRowCommand({
          revisionId: draftRevisionId,
          tableId,
          rowId: 'newRow',
          data: { ver: 42 },
        }),
      );

      // 3. getRows must reflect the new row, not return cached result
      const rowsAfter = await rowApiService.getRows({
        revisionId: draftRevisionId,
        tableId,
        first: 100,
      });
      expect(rowsAfter.totalCount).toBe(2);
    });
  });

  describe('RowUpdatedEventHandler', () => {
    it('should invalidate row cache after update', async () => {
      const { draftRevisionId, tableId, rowId } =
        await prepareProject(prismaService);

      // 1. Cache the row
      const rowBefore = await rowApiService.getRow({
        revisionId: draftRevisionId,
        tableId,
        rowId,
      });
      expect(rowBefore?.data).toEqual({ ver: 2 });

      // 2. Update the row
      await runTransaction(
        new ApiUpdateRowCommand({
          revisionId: draftRevisionId,
          tableId,
          rowId,
          data: { ver: 99 },
        }),
      );

      // 3. getRow must return updated data, not cached
      const rowAfter = await rowApiService.getRow({
        revisionId: draftRevisionId,
        tableId,
        rowId,
      });
      expect(rowAfter?.data).toEqual({ ver: 99 });
    });

    it('should invalidate getRows cache after update', async () => {
      const { draftRevisionId, tableId, rowId } =
        await prepareProject(prismaService);

      // 1. Cache getRows
      const rowsBefore = await rowApiService.getRows({
        revisionId: draftRevisionId,
        tableId,
        first: 100,
      });
      const dataBefore = rowsBefore.edges[0].node.data;
      expect(dataBefore).toEqual({ ver: 2 });

      // 2. Update
      await runTransaction(
        new ApiUpdateRowCommand({
          revisionId: draftRevisionId,
          tableId,
          rowId,
          data: { ver: 77 },
        }),
      );

      // 3. getRows must reflect update
      const rowsAfter = await rowApiService.getRows({
        revisionId: draftRevisionId,
        tableId,
        first: 100,
      });
      const dataAfter = rowsAfter.edges[0].node.data;
      expect(dataAfter).toEqual({ ver: 77 });
    });
  });

  describe('RowDeletedEventHandler', () => {
    it('should invalidate row cache after delete', async () => {
      const { draftRevisionId, tableId, rowId } =
        await prepareProject(prismaService);

      // 1. Cache the row
      const rowBefore = await rowApiService.getRow({
        revisionId: draftRevisionId,
        tableId,
        rowId,
      });
      expect(rowBefore).not.toBeNull();

      // 2. Delete the row
      await runTransaction(
        new ApiRemoveRowCommand({
          revisionId: draftRevisionId,
          tableId,
          rowId,
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

    it('should invalidate getRows cache after delete', async () => {
      const { draftRevisionId, tableId, rowId } =
        await prepareProject(prismaService);

      // 1. Cache getRows
      const rowsBefore = await rowApiService.getRows({
        revisionId: draftRevisionId,
        tableId,
        first: 100,
      });
      expect(rowsBefore.totalCount).toBe(1);

      // 2. Delete
      await runTransaction(
        new ApiRemoveRowCommand({
          revisionId: draftRevisionId,
          tableId,
          rowId,
        }),
      );

      // 3. getRows must reflect deletion
      const rowsAfter = await rowApiService.getRows({
        revisionId: draftRevisionId,
        tableId,
        first: 100,
      });
      expect(rowsAfter.totalCount).toBe(0);
    });
  });

  describe('RowsDeletedEventHandler', () => {
    it('should invalidate all deleted rows and getRows cache', async () => {
      const { draftRevisionId, tableId, rowId } =
        await prepareProject(prismaService);

      // Create a second row
      await runTransaction(
        new ApiCreateRowCommand({
          revisionId: draftRevisionId,
          tableId,
          rowId: 'row2',
          data: { ver: 10 },
        }),
      );

      // 1. Cache getRows and both individual rows
      const rowsBefore = await rowApiService.getRows({
        revisionId: draftRevisionId,
        tableId,
        first: 100,
      });
      expect(rowsBefore.totalCount).toBe(2);

      const row1 = await rowApiService.getRow({
        revisionId: draftRevisionId,
        tableId,
        rowId,
      });
      expect(row1).not.toBeNull();

      const row2 = await rowApiService.getRow({
        revisionId: draftRevisionId,
        tableId,
        rowId: 'row2',
      });
      expect(row2).not.toBeNull();

      // 2. Batch delete both rows
      await runTransaction(
        new ApiRemoveRowsCommand({
          revisionId: draftRevisionId,
          tableId,
          rowIds: [rowId, 'row2'],
        }),
      );

      // 3. Both rows must return null
      const row1After = await rowApiService.getRow({
        revisionId: draftRevisionId,
        tableId,
        rowId,
      });
      expect(row1After).toBeNull();

      const row2After = await rowApiService.getRow({
        revisionId: draftRevisionId,
        tableId,
        rowId: 'row2',
      });
      expect(row2After).toBeNull();

      // 4. getRows must be empty
      const rowsAfter = await rowApiService.getRows({
        revisionId: draftRevisionId,
        tableId,
        first: 100,
      });
      expect(rowsAfter.totalCount).toBe(0);
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
