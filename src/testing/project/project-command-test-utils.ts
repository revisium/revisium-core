import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { CoreModule } from 'src/core/core.module';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';
import { prepareProject } from 'src/testing/utils/prepareProject';

export const createTestingModule = async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [CoreModule.forRoot({ mode: 'monolith' })],
  }).compile();

  await module.init();

  return {
    module,
    prismaService: module.get(PrismaService),
    commandBus: module.get(CommandBus),
    transactionService: module.get(TransactionPrismaService),
    shareTransactionalQueries: module.get(ShareTransactionalQueries),
    endpointNotificationService: module.get(EndpointNotificationService),
  };
};

export { prepareProject };

export const createMock = <T>(mockResolvedValue: T) =>
  mockResolvedValue instanceof Error
    ? jest.fn().mockRejectedValue(mockResolvedValue)
    : jest.fn().mockResolvedValue(mockResolvedValue);
