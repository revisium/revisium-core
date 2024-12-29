// TODO fix "revisium" repository
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { CommandBus } from '@nestjs/cqrs';
import { AsyncLocalStorage } from 'async_hooks';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { IdService } from 'src/database/id.service';
import { PrismaService } from 'src/database/prisma.service';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { ShareTransactionalCommands } from 'src/share/share.transactional.commands';
import { ShareTransactionalQueries } from 'src/share/share.transactional.queries';

export const createMocks = ({
  asyncLocalStorageStore,
}: {
  asyncLocalStorageStore?: any;
} = {}) => {
  const prisma: DeepMockProxy<PrismaService> = mockDeep<PrismaService>();
  const commandBus: DeepMockProxy<CommandBus> = mockDeep<CommandBus>();
  const transactionPrisma: DeepMockProxy<TransactionPrismaService> =
    mockDeep<TransactionPrismaService>();
  const asyncLocalStorage: DeepMockProxy<AsyncLocalStorage<any>> =
    mockDeep<AsyncLocalStorage<any>>();

  transactionPrisma.run.mockImplementation((handler) => handler());
  transactionPrisma.getTransaction.mockImplementation(() => prisma);

  const idService = mockDeep<IdService>();

  const shareTransactionalCommands: DeepMockProxy<ShareTransactionalCommands> =
    mockDeep<ShareTransactionalCommands>();
  const shareTransactionalQueries: DeepMockProxy<ShareTransactionalQueries> =
    mockDeep<ShareTransactionalQueries>();

  if (asyncLocalStorageStore) {
    asyncLocalStorage.run.mockImplementation((_, handler) => handler());
    asyncLocalStorage.getStore.mockImplementation(() => asyncLocalStorageStore);
  }

  return {
    prisma,
    transactionPrisma,
    commandBus,
    idService,
    asyncLocalStorage,
    shareTransactionalCommands,
    shareTransactionalQueries,
  };
};