import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  getTableDiffsPaginatedBetweenRevisions,
  hasTableDiffsBetweenRevisions,
  countTableDiffsBetweenRevisions,
  hasRowDiffsBetweenRevisions,
} from 'src/__generated__/sql';

export enum TableDiffChangeType {
  Modified = 'modified',
  Added = 'added',
  Removed = 'removed',
}

export interface TableDiff {
  id: string;
  fromId: string | null;
  toId: string | null;
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

  public async tableDiffs({
    fromRevisionId,
    toRevisionId,
    limit = 1,
    offset = 0,
  }: {
    fromRevisionId: string;
    toRevisionId: string;
    limit?: number;
    offset?: number;
  }): Promise<TableDiff[]> {
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
        fromId: row.fromId,
        toId: row.toId,
        createdId,
        fromVersionId: row.fromVersionId,
        toVersionId: row.toVersionId,
        changeType: row.changeType as TableDiffChangeType,
      };
    });
  }

  public async hasTableDiffs(options: {
    fromRevisionId: string;
    toRevisionId: string;
  }): Promise<boolean> {
    const result = await this.prisma.$queryRawTyped(
      hasTableDiffsBetweenRevisions(
        options.fromRevisionId,
        options.toRevisionId,
      ),
    );

    return Boolean(result[0]?.exists);
  }

  public async countTableDiffs(options: {
    fromRevisionId: string;
    toRevisionId: string;
  }): Promise<number> {
    const result = await this.prisma.$queryRawTyped(
      countTableDiffsBetweenRevisions(
        options.fromRevisionId,
        options.toRevisionId,
      ),
    );

    return result[0]?.count || 0;
  }

  public async hasRowDiffs(options: {
    tableCreatedId: string;
    fromRevisionId: string;
    toRevisionId: string;
  }): Promise<boolean> {
    const result = await this.prisma.$queryRawTyped(
      hasRowDiffsBetweenRevisions(
        options.tableCreatedId,
        options.fromRevisionId,
        options.toRevisionId,
      ),
    );

    return Boolean(result[0]?.exists);
  }
}
