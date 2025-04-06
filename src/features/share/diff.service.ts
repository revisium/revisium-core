import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { getTableDiffsPaginatedBetweenRevisions } from '@prisma/client/sql';

@Injectable()
export class DiffService {
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly prismaService: PrismaService,
  ) {}

  private get prisma() {
    return this.transactionService.getTransactionUnsafe() ?? this.prismaService;
  }

  public tableDiffs(
    fromRevisionId: string,
    toRevisionId: string,
    limit = 1,
    offset: number = 0,
  ) {
    return this.prisma.$queryRawTyped(
      getTableDiffsPaginatedBetweenRevisions(
        fromRevisionId,
        toRevisionId,
        limit,
        offset,
      ),
    );
  }
}
