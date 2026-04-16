import { Test, type TestingModule } from '@nestjs/testing';
import { CommandBus, CqrsModule } from '@nestjs/cqrs';
import { EngineModule } from '@revisium/engine';
import { AppOptionsModule } from 'src/core/app-options.module';
import { BranchModule } from 'src/features/branch/branch.module';
import { DRAFT_REVISION_COMMANDS_HANDLERS } from 'src/features/draft-revision/commands/handlers';
import { DraftRevisionApiService } from 'src/features/draft-revision/draft-revision-api.service';
import {
  DraftRevisionInternalService,
  DraftRevisionValidationService,
} from 'src/features/draft-revision/services';
import { RevisionModule } from 'src/features/revision/revision.module';
import { DiffService } from 'src/features/share/diff.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { RevisiumCacheModule } from 'src/infrastructure/cache';
import { CACHE_SERVICE } from 'src/infrastructure/cache/services/cache.tokens';
import { NoopCacheService } from 'src/infrastructure/cache/services/noop-cache.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

export interface DraftRevisionCommandTestKit {
  module: TestingModule;
  prismaService: PrismaService;
  commandBus: CommandBus;
  transactionService: TransactionPrismaService;
  draftRevisionApiService: DraftRevisionApiService;
  executeSerializable<TResult>(command: object): Promise<TResult>;
  close(): Promise<void>;
}

export async function createDraftRevisionCommandTestKit(): Promise<DraftRevisionCommandTestKit> {
  const module = await Test.createTestingModule({
    imports: [
      DatabaseModule,
      CqrsModule,
      { ...EngineModule.forRoot({}), global: true },
      RevisiumCacheModule.forRootAsync(),
      AppOptionsModule.forRoot({ mode: 'monolith' }),
      RevisionModule,
      BranchModule,
    ],
    providers: [
      DraftRevisionApiService,
      DraftRevisionInternalService,
      DraftRevisionValidationService,
      DiffService,
      ShareTransactionalQueries,
      ...DRAFT_REVISION_COMMANDS_HANDLERS,
    ],
  })
    .overrideProvider(CACHE_SERVICE)
    .useValue(new NoopCacheService())
    .compile();

  await module.init();

  const commandBus = module.get(CommandBus);
  const transactionService = module.get(TransactionPrismaService);

  return {
    module,
    prismaService: module.get(PrismaService),
    commandBus,
    transactionService,
    draftRevisionApiService: module.get(DraftRevisionApiService),
    executeSerializable<TResult>(command: object): Promise<TResult> {
      return transactionService.runSerializable(() =>
        commandBus.execute<object, TResult>(command),
      );
    },
    async close() {
      await module.close();
    },
  };
}
