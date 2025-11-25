import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
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
import { RowChangeMapper } from '../../mappers/row-change.mapper';
import { RevisionComparisonService } from '../../services/revision-comparison.service';

@QueryHandler(GetRowChangesQuery)
export class GetRowChangesHandler
  implements IQueryHandler<GetRowChangesQuery, GetRowChangesQueryReturnType>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly rowDiffService: RowDiffService,
    private readonly revisionComparisonService: RevisionComparisonService,
    private readonly rowChangeMapper: RowChangeMapper,
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
        const rows = await this.getRowChanges(
          fromRevisionId,
          revisionId,
          args.take,
          args.skip,
          filters,
          includeSystem,
        );

        return Promise.all(rows.map((row) => this.mapToRowChange(row)));
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

  private async mapToRowChange(row: any): Promise<RowChange> {
    const fieldChanges = this.rowDiffService.analyzeFieldChanges(
      row.fromData as Record<string, unknown> | null,
      row.toData as Record<string, unknown> | null,
    );

    return this.rowChangeMapper.mapRawDataToRowChange(row, fieldChanges);
  }
}
