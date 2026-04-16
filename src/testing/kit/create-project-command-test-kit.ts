import { CommandBus } from '@nestjs/cqrs';
import { Test, type TestingModule } from '@nestjs/testing';
import { CoreModule } from 'src/core/core.module';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

export interface ProjectCommandTestKit {
  module: TestingModule;
  prismaService: PrismaService;
  commandBus: CommandBus;
  transactionService: TransactionPrismaService;
  shareTransactionalQueries: ShareTransactionalQueries;
  endpointNotificationService: EndpointNotificationService;
  executeSerializable<TResult>(command: object): Promise<TResult>;
  close(): Promise<void>;
}

export async function createProjectCommandTestKit(): Promise<ProjectCommandTestKit> {
  const module = await Test.createTestingModule({
    imports: [CoreModule.forRoot({ mode: 'monolith' })],
  }).compile();

  await module.init();

  const commandBus = module.get(CommandBus);
  const transactionService = module.get(TransactionPrismaService);

  return {
    module,
    prismaService: module.get(PrismaService),
    commandBus,
    transactionService,
    shareTransactionalQueries: module.get(ShareTransactionalQueries),
    endpointNotificationService: module.get(EndpointNotificationService),
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
