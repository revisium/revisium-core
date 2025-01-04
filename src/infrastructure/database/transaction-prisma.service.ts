import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaClient } from 'src/features/share/types';

@Injectable()
export class TransactionPrismaService {
  private asyncLocalStorage = new AsyncLocalStorage<{
    $prisma: TransactionPrismaClient;
  }>();

  constructor(private prismaService: PrismaService) {}

  public getTransaction() {
    const transactionInCurrentContext = this.asyncLocalStorage.getStore();

    if (!transactionInCurrentContext?.$prisma) {
      throw new InternalServerErrorException(
        'TransactionPrismaClient not found. It appears that an attempt was made to access a transaction outside the context of TransactionalPrismaService.runTransaction.',
      );
    }

    return transactionInCurrentContext.$prisma;
  }

  public run<T, Func extends (...rest: unknown[]) => Promise<T>>(
    handler: Func,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<T> {
    return this.prismaService.$transaction(async ($prisma) => {
      return this.asyncLocalStorage.run({ $prisma }, handler);
    }, options);
  }
}
