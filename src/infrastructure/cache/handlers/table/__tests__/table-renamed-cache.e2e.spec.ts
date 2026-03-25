import { CommandBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import {
  RenameTableCommand,
  RenameTableCommandReturnType,
} from 'src/features/draft/commands/impl/rename-table.command';
import { RowApiService } from 'src/features/row/row-api.service';
import { InMemoryBentoCache } from 'src/infrastructure/cache/handlers/__tests__/in-memory-bento-cache';
import { CACHE_SERVICE } from 'src/infrastructure/cache/services/cache.tokens';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('TableRenamedEventHandler (e2e cache)', () => {
  const nextTableId = 'renamedTable';

  it('should invalidate cached null for row in renamed table', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    // 1. Cache null for the row under the future table name
    const cachedNull = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId: nextTableId,
      rowId,
    });
    expect(cachedNull).toBeNull();

    // 2. Rename table: oldTableId -> nextTableId
    const command = new RenameTableCommand({
      revisionId: draftRevisionId,
      tableId,
      nextTableId,
    });
    await runTransaction(command);

    // 3. getRow under new table name must return data, not cached null
    const row = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId: nextTableId,
      rowId,
    });
    expect(row).not.toBeNull();
    expect(row?.id).toBe(rowId);

    // 4. getRow under old table name should return null
    const oldRow = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });
    expect(oldRow).toBeNull();
  });

  function runTransaction(
    command: RenameTableCommand,
  ): Promise<RenameTableCommandReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
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
