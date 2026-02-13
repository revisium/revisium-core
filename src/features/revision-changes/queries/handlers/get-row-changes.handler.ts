import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Row } from 'src/__generated__/client';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  GetRowChangesQuery,
  GetRowChangesQueryReturnType,
} from '../impl/get-row-changes.query';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';
import { RowDiffService } from '../../services/row-diff.service';
import { RowChange } from '../../types';
import { getRowChangesPaginatedBetweenRevisions } from 'src/__generated__/client/sql/getRowChangesPaginatedBetweenRevisions';
import { countRowChangesBetweenRevisions } from 'src/__generated__/client/sql/countRowChangesBetweenRevisions';
import { createEmptyPaginatedResponse } from '../../utils/empty-responses';
import {
  RowChangeMapper,
  RawRowChangeData,
} from '../../mappers/row-change.mapper';
import { RevisionComparisonService } from '../../services/revision-comparison.service';
import { PluginService } from 'src/features/plugin/plugin.service';
import { ChangeType } from '../../types/enums';

@QueryHandler(GetRowChangesQuery)
export class GetRowChangesHandler implements IQueryHandler<
  GetRowChangesQuery,
  GetRowChangesQueryReturnType
> {
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly rowDiffService: RowDiffService,
    private readonly revisionComparisonService: RevisionComparisonService,
    private readonly rowChangeMapper: RowChangeMapper,
    private readonly pluginService: PluginService,
  ) {}

  private get prisma() {
    return this.transactionService.getTransactionOrPrisma();
  }

  async execute({
    data,
  }: GetRowChangesQuery): Promise<GetRowChangesQueryReturnType> {
    const { revisionId, compareWithRevisionId, filters } = data;

    const fromRevisionId =
      await this.revisionComparisonService.getCompareRevisionId(
        revisionId,
        compareWithRevisionId,
      );

    if (!fromRevisionId) {
      return createEmptyPaginatedResponse<RowChange>();
    }

    const includeSystem = filters?.includeSystem ?? false;

    return getOffsetPagination({
      pageData: data,
      findMany: async (args) => {
        const rawRows = await this.getRowChanges(
          fromRevisionId,
          revisionId,
          args.take,
          args.skip,
          filters,
          includeSystem,
        );

        await this.computeRowsForTables(rawRows, fromRevisionId, revisionId);

        return rawRows.map((raw) => this.mapToRowChange(raw));
      },
      count: () =>
        this.countRowChanges(
          fromRevisionId,
          revisionId,
          filters,
          includeSystem,
        ),
    });
  }

  private async getRowChanges(
    fromRevisionId: string,
    toRevisionId: string,
    limit: number,
    offset: number,
    filters?: GetRowChangesQuery['data']['filters'],
    includeSystem = false,
  ) {
    const tableCreatedId = await this.resolveTableCreatedId(
      toRevisionId,
      filters,
    );
    const searchTerm = filters?.search;
    const changeTypes = filters?.changeTypes
      ? JSON.stringify(filters.changeTypes)
      : null;

    return this.prisma.$queryRawTyped(
      getRowChangesPaginatedBetweenRevisions(
        fromRevisionId,
        toRevisionId,
        (tableCreatedId ?? null) as any,
        (searchTerm ?? null) as any,
        changeTypes as any,
        limit,
        offset,
        includeSystem,
      ),
    );
  }

  private async countRowChanges(
    fromRevisionId: string,
    toRevisionId: string,
    filters?: GetRowChangesQuery['data']['filters'],
    includeSystem = false,
  ): Promise<number> {
    const tableCreatedId = await this.resolveTableCreatedId(
      toRevisionId,
      filters,
    );
    const searchTerm = filters?.search;
    const changeTypes = filters?.changeTypes
      ? JSON.stringify(filters.changeTypes)
      : null;

    const result = await this.prisma.$queryRawTyped(
      countRowChangesBetweenRevisions(
        fromRevisionId,
        toRevisionId,
        (tableCreatedId ?? null) as any,
        (searchTerm ?? null) as any,
        changeTypes as any,
        includeSystem,
      ),
    );

    return Number(result[0]?.count ?? 0);
  }

  private async resolveTableCreatedId(
    revisionId: string,
    filters?: GetRowChangesQuery['data']['filters'],
  ): Promise<string | undefined> {
    if (!filters?.tableId) {
      return undefined;
    }

    const table = await this.prisma.table.findFirst({
      where: {
        id: filters.tableId,
        revisions: {
          some: {
            id: revisionId,
          },
        },
      },
      select: {
        createdId: true,
      },
    });

    return table?.createdId ?? undefined;
  }

  private mapToRowChange(raw: RawRowChangeData): RowChange {
    const fieldChanges = this.rowDiffService.analyzeFieldChanges(
      raw.fromData as Record<string, unknown> | null,
      raw.toData as Record<string, unknown> | null,
    );

    return this.rowChangeMapper.mapRawDataToRowChange(raw, fieldChanges);
  }

  private async computeRowsForTables(
    rawRows: RawRowChangeData[],
    fromRevisionId: string,
    toRevisionId: string,
  ): Promise<void> {
    const toRowsByTable = new Map<string, Row[]>();
    const fromRowsByTable = new Map<string, Row[]>();

    for (const rawRow of rawRows) {
      if (rawRow.changeType !== ChangeType.Removed && rawRow.toTableId) {
        if (!toRowsByTable.has(rawRow.toTableId)) {
          toRowsByTable.set(rawRow.toTableId, []);
        }
        toRowsByTable
          .get(rawRow.toTableId)
          ?.push(this.createToRowProxy(rawRow));
      }

      if (rawRow.changeType !== ChangeType.Added && rawRow.fromTableId) {
        if (!fromRowsByTable.has(rawRow.fromTableId)) {
          fromRowsByTable.set(rawRow.fromTableId, []);
        }
        fromRowsByTable
          .get(rawRow.fromTableId)
          ?.push(this.createFromRowProxy(rawRow));
      }
    }

    await Promise.all([
      ...Array.from(toRowsByTable.entries()).map(([tableId, rows]) =>
        this.pluginService.computeRows({
          revisionId: toRevisionId,
          tableId,
          rows,
        }),
      ),
      ...Array.from(fromRowsByTable.entries()).map(([tableId, rows]) =>
        this.pluginService.computeRows({
          revisionId: fromRevisionId,
          tableId,
          rows,
        }),
      ),
    ]);
  }

  private createToRowProxy(rawRow: RawRowChangeData): Row {
    return {
      id: rawRow.toRowId,
      createdId: rawRow.toRowCreatedId,
      versionId: rawRow.toRowVersionId,
      hash: rawRow.toHash,
      schemaHash: rawRow.toSchemaHash,
      readonly: rawRow.toReadonly,
      meta: rawRow.toMeta,
      createdAt: rawRow.toRowCreatedAt,
      updatedAt: rawRow.toRowUpdatedAt,
      publishedAt: rawRow.toRowPublishedAt,
      get data() {
        return rawRow.toData;
      },
      set data(value) {
        rawRow.toData = value;
      },
    };
  }

  private createFromRowProxy(rawRow: RawRowChangeData): Row {
    return {
      id: rawRow.fromRowId,
      createdId: rawRow.fromRowCreatedId,
      versionId: rawRow.fromRowVersionId,
      hash: rawRow.fromHash,
      schemaHash: rawRow.fromSchemaHash,
      readonly: rawRow.fromReadonly,
      meta: rawRow.fromMeta,
      createdAt: rawRow.fromRowCreatedAt,
      updatedAt: rawRow.fromRowUpdatedAt,
      publishedAt: rawRow.fromRowPublishedAt,
      get data() {
        return rawRow.fromData;
      },
      set data(value) {
        rawRow.fromData = value;
      },
    };
  }
}
