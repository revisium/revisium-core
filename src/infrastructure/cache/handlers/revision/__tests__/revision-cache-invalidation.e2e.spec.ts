import { CommandBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { ApiCreateRowCommand } from 'src/features/draft/commands/impl/api-create-row.command';
import { ApiUpdateRowCommand } from 'src/features/draft/commands/impl/api-update-row.command';
import { CreateRevisionCommand } from 'src/features/draft/commands/impl/create-revision.command';
import { RevertChangesCommand } from 'src/features/draft/commands/impl/revert-changes.command';
import { RowApiService } from 'src/features/row/row-api.service';
import { InMemoryBentoCache } from 'src/infrastructure/cache/handlers/__tests__/in-memory-bento-cache';
import { CACHE_SERVICE } from 'src/infrastructure/cache/services/cache.tokens';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('Revision cache invalidation (e2e)', () => {
  describe('RevisionCommittedEventHandler', () => {
    it('should invalidate draft revision cache after commit', async () => {
      const {
        organizationId,
        projectName,
        branchName,
        draftRevisionId,
        tableId,
      } = await prepareProject(prismaService);

      // 1. Cache getRows in draft (1 row)
      const rowsBefore = await rowApiService.getRows({
        revisionId: draftRevisionId,
        tableId,
        first: 100,
      });
      expect(rowsBefore.totalCount).toBe(1);

      // 2. Add a new row to draft
      await runTransaction(
        new ApiCreateRowCommand({
          revisionId: draftRevisionId,
          tableId,
          rowId: 'commitTestRow',
          data: { ver: 42 },
        }),
      );

      // 3. Commit — draftRevisionId becomes new head, cache must be invalidated
      await runTransaction(
        new CreateRevisionCommand({
          organizationId,
          projectName,
          branchName,
        }),
      );

      // 4. getRows for draftRevisionId (now head) must return 2 rows, not cached 1
      const rowsAfterCommit = await rowApiService.getRows({
        revisionId: draftRevisionId,
        tableId,
        first: 100,
      });
      expect(rowsAfterCommit.totalCount).toBe(2);
    });
  });

  describe('RevisionRevertedEventHandler', () => {
    it('should invalidate cache after revert', async () => {
      const {
        organizationId,
        projectName,
        branchName,
        draftRevisionId,
        tableId,
        rowId,
      } = await prepareProject(prismaService);

      // 1. Make a change in draft
      await runTransaction(
        new ApiUpdateRowCommand({
          revisionId: draftRevisionId,
          tableId,
          rowId,
          data: { ver: 999 },
        }),
      );

      // 2. Cache the modified row
      const rowModified = await rowApiService.getRow({
        revisionId: draftRevisionId,
        tableId,
        rowId,
      });
      expect(rowModified?.data).toEqual({ ver: 999 });

      // 3. Revert changes
      await runTransaction(
        new RevertChangesCommand({
          organizationId,
          projectName,
          branchName,
        }),
      );

      // 4. getRow must return reverted data, not cached modified data
      const rowAfterRevert = await rowApiService.getRow({
        revisionId: draftRevisionId,
        tableId,
        rowId,
      });
      expect(rowAfterRevert).not.toBeNull();
      expect(rowAfterRevert?.data).toEqual({ ver: 1 });
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
