import { CommandBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import {
  RenameRowCommand,
  RenameRowCommandReturnType,
} from 'src/features/draft/commands/impl/rename-row.command';
import { RowApiService } from 'src/features/row/row-api.service';
import { CACHE_SERVICE } from 'src/infrastructure/cache/services/cache.tokens';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

class InMemoryBentoCache {
  private store = new Map<string, { value: unknown; tags: string[] }>();

  async getOrSet(options: {
    key: string;
    tags?: string[];
    factory: (ctx: unknown) => Promise<unknown>;
  }) {
    if (this.store.has(options.key)) {
      return this.store.get(options.key)!.value;
    }

    const noopCtx = {
      setOptions: () => true,
      setTags: () => {},
      fail: () => {},
      skip: () => {},
      setTtl: () => {},
      gracedEntry: undefined,
    };

    const value = await options.factory(noopCtx);
    this.store.set(options.key, { value, tags: options.tags || [] });
    return value;
  }

  async delete(options: { key: string }) {
    this.store.delete(options.key);
    return true;
  }

  async deleteByTag(options: { tags: string[] }) {
    const tagsToDelete = new Set(options.tags);
    for (const [key, entry] of this.store) {
      if (entry.tags.some((t) => tagsToDelete.has(t))) {
        this.store.delete(key);
      }
    }
    return true;
  }
}

describe('RowRenamedEventHandler (e2e cache)', () => {
  const nextRowId = 'renamedRow';

  it('should invalidate cached null for new rowId after rename', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    // 1. Cache null for the new rowId (row doesn't exist yet under this id)
    const cachedNull = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId: nextRowId,
    });
    expect(cachedNull).toBeNull();

    // 2. Rename row: oldRowId -> nextRowId
    const command = new RenameRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      nextRowId,
    });
    await runTransaction(command);

    // 3. getRow(nextRowId) must return actual data, not cached null
    const row = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId: nextRowId,
    });
    expect(row).not.toBeNull();
    expect(row?.id).toBe(nextRowId);

    // 4. Old rowId should not return stale cached data
    const oldRow = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });
    expect(oldRow).toBeNull();
  });

  function runTransaction(
    command: RenameRowCommand,
  ): Promise<RenameRowCommandReturnType> {
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
