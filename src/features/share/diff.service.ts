import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { getTableDiffsPaginatedBetweenRevisions } from '@prisma/client/sql';

export enum TableDiffChangeType {
  Modified = 'modified',
  Added = 'added',
  Removed = 'removed',
}

export interface TableDiff {
  id: string;
  createdId: string;
  fromVersionId: string | null;
  toVersionId: string | null;
  changeType: TableDiffChangeType;
}

@Injectable()
export class DiffService {
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly prismaService: PrismaService,
  ) {}

  private get prisma() {
    return this.transactionService.getTransactionUnsafe() ?? this.prismaService;
  }

  public async tableDiffs(
    fromRevisionId: string,
    toRevisionId: string,
    limit = 1,
    offset: number = 0,
  ): Promise<TableDiff[]> {
    const result = await this.prisma.$queryRawTyped(
      getTableDiffsPaginatedBetweenRevisions(
        fromRevisionId,
        toRevisionId,
        limit,
        offset,
      ),
    );

    return result.map((row): TableDiff => {
      const id = row.fromId ?? row.toId;
      const createdId = row.fromCreatedId ?? row.toCreatedId;

      if (!id) {
        throw new Error(`Invalid fromId=${row.fromId} or toId=${row.toId}`);
      }

      if (!createdId) {
        throw new Error(
          `Invalid fromCreatedId=${row.fromCreatedId} or toCreatedId=${row.toCreatedId}`,
        );
      }

      if (!row.fromVersionId && !row.toVersionId) {
        throw new Error(
          `Invalid fromVersionId=${row.fromVersionId} or toVersionId=${row.toVersionId}`,
        );
      }

      return {
        id,
        createdId,
        fromVersionId: row.fromVersionId,
        toVersionId: row.toVersionId,
        changeType: row.changeType as TableDiffChangeType,
      };
    });
  }
}
