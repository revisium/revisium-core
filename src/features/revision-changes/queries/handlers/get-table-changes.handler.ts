import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  GetTableChangesQuery,
  GetTableChangesQueryReturnType,
} from '../impl/get-table-changes.query';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';
import { DiffService, TableDiff } from 'src/features/share/diff.service';
import { TableChange } from '../../types';
import { getRowChangesStatsBetweenRevisions } from 'src/__generated__/client/sql/getRowChangesStatsBetweenRevisions';
import { RevisionComparisonService } from '../../services/revision-comparison.service';
import { createEmptyPaginatedResponse } from '../../utils/empty-responses';
import { TableChangeMapper } from '../../mappers/table-change.mapper';

@QueryHandler(GetTableChangesQuery)
export class GetTableChangesHandler
  implements IQueryHandler<GetTableChangesQuery, GetTableChangesQueryReturnType>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly diffService: DiffService,
    private readonly revisionComparisonService: RevisionComparisonService,
    private readonly tableChangeMapper: TableChangeMapper,
  ) {}

  private get prisma() {
    return this.transactionService.getTransactionOrPrisma();
  }

  async execute({
    data,
  }: GetTableChangesQuery): Promise<GetTableChangesQueryReturnType> {
    const { revisionId, compareWithRevisionId, filters } = data;

    const fromRevisionId =
      await this.revisionComparisonService.getCompareRevisionId(
        revisionId,
        compareWithRevisionId,
      );

    if (!fromRevisionId) {
      return createEmptyPaginatedResponse<TableChange>();
    }

    const includeSystem = filters?.includeSystem ?? false;

    return getOffsetPagination({
      pageData: data,
      findMany: async (args) => {
        const tableDiffs = await this.diffService.tableDiffs({
          fromRevisionId,
          toRevisionId: revisionId,
          limit: args.take,
          offset: args.skip,
          includeSystem,
        });

        return Promise.all(
          tableDiffs.map((diff) =>
            this.mapToTableChange(
              diff,
              revisionId,
              fromRevisionId,
              includeSystem,
            ),
          ),
        );
      },
      count: () =>
        this.diffService.countTableDiffs({
          fromRevisionId,
          toRevisionId: revisionId,
          includeSystem,
        }),
    });
  }

  private async mapToTableChange(
    diff: TableDiff,
    revisionId: string,
    fromRevisionId: string,
    includeSystem = false,
  ): Promise<TableChange> {
    const migrations =
      await this.revisionComparisonService.getMigrationsForTable(
        revisionId,
        diff.createdId,
      );

    const rowStats = await this.getRowsStatsForTable(
      fromRevisionId,
      revisionId,
      diff.createdId,
      includeSystem,
    );

    return this.tableChangeMapper.mapTableDiffToTableChange(
      diff,
      migrations,
      rowStats,
    );
  }

  private async getRowsStatsForTable(
    fromRevisionId: string,
    toRevisionId: string,
    tableCreatedId: string,
    includeSystem = false,
  ) {
    const result = await this.prisma.$queryRawTyped(
      getRowChangesStatsBetweenRevisions(
        fromRevisionId,
        toRevisionId,
        tableCreatedId,
        includeSystem,
      ),
    );

    return result[0] ?? null;
  }
}
