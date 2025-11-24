import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { getTableDiffsPaginatedBetweenRevisions } from 'src/__generated__/client/sql/getTableDiffsPaginatedBetweenRevisions';
import { hasTableDiffsBetweenRevisions } from 'src/__generated__/client/sql/hasTableDiffsBetweenRevisions';
import { countTableDiffsBetweenRevisions } from 'src/__generated__/client/sql/countTableDiffsBetweenRevisions';
import { getTableDiffsStatsBetweenRevisions } from 'src/__generated__/client/sql/getTableDiffsStatsBetweenRevisions';
import { hasRowDiffsBetweenRevisions } from 'src/__generated__/client/sql/hasRowDiffsBetweenRevisions';

export enum TableDiffChangeType {
  Modified = 'modified',
  Added = 'added',
  Removed = 'removed',
  Renamed = 'renamed',
  RenamedAndModified = 'renamed_and_modified',
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
    includeSystem = false,
    changeTypes,
  }: {
    fromRevisionId: string;
    toRevisionId: string;
    limit?: number;
    offset?: number;
    includeSystem?: boolean;
    changeTypes?: string[];
  }): Promise<TableDiff[]> {
    const changeTypesJson = changeTypes ? JSON.stringify(changeTypes) : null;

    const result = await this.prisma.$queryRawTyped(
      getTableDiffsPaginatedBetweenRevisions(
        fromRevisionId,
        toRevisionId,
        changeTypesJson as any,
        limit,
        offset,
        includeSystem,
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
    includeSystem?: boolean;
    changeTypes?: string[];
  }): Promise<number> {
    const changeTypesJson = options.changeTypes
      ? JSON.stringify(options.changeTypes)
      : null;

    const result = await this.prisma.$queryRawTyped(
      countTableDiffsBetweenRevisions(
        options.fromRevisionId,
        options.toRevisionId,
        changeTypesJson as any,
        options.includeSystem ?? false,
      ),
    );

    return result[0]?.count || 0;
  }

  public async getTableDiffsStats(options: {
    fromRevisionId: string;
    toRevisionId: string;
    includeSystem?: boolean;
  }): Promise<{
    total: number;
    added: number;
    modified: number;
    removed: number;
    renamed: number;
    renamedAndModified: number;
  }> {
    const result = await this.prisma.$queryRawTyped(
      getTableDiffsStatsBetweenRevisions(
        options.fromRevisionId,
        options.toRevisionId,
        options.includeSystem ?? false,
      ),
    );

    const row = result[0];

    if (!row) {
      return {
        total: 0,
        added: 0,
        modified: 0,
        removed: 0,
        renamed: 0,
        renamedAndModified: 0,
      };
    }

    return {
      total: row.total ?? 0,
      added: row.added ?? 0,
      modified: row.modified ?? 0,
      removed: row.removed ?? 0,
      renamed: row.renamed ?? 0,
      renamedAndModified: row.renamed_and_modified ?? 0,
    };
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
