import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  GetRevisionChangesQuery,
  GetRevisionChangesQueryReturnType,
} from '../impl/get-revision-changes.query';
import { DiffService } from 'src/features/share/diff.service';
import { getRowChangesStatsBetweenRevisions } from 'src/__generated__/client/sql/getRowChangesStatsBetweenRevisions';
import { RevisionComparisonService } from '../../services/revision-comparison.service';
import { createEmptyRevisionChangesResponse } from '../../utils/empty-responses';

@QueryHandler(GetRevisionChangesQuery)
export class GetRevisionChangesHandler
  implements
    IQueryHandler<GetRevisionChangesQuery, GetRevisionChangesQueryReturnType>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly diffService: DiffService,
    private readonly revisionComparisonService: RevisionComparisonService,
  ) {}

  private get prisma() {
    return this.transactionService.getTransactionOrPrisma();
  }

  async execute({
    data,
  }: GetRevisionChangesQuery): Promise<GetRevisionChangesQueryReturnType> {
    const { revisionId, compareWithRevisionId, includeSystem = false } = data;

    const fromRevisionId =
      await this.revisionComparisonService.getCompareRevisionId(
        revisionId,
        compareWithRevisionId,
      );

    if (!fromRevisionId) {
      return createEmptyRevisionChangesResponse(revisionId);
    }

    const tablesStats = await this.diffService.getTableDiffsStats({
      fromRevisionId,
      toRevisionId: revisionId,
      includeSystem,
    });

    const rowsStats = await this.getRowsStats(
      fromRevisionId,
      revisionId,
      includeSystem,
    );

    return {
      revisionId,
      parentRevisionId: fromRevisionId,
      totalChanges: tablesStats.total + rowsStats.total,
      tablesSummary: tablesStats,
      rowsSummary: rowsStats,
      schemaChangesCount: rowsStats.schemaChanges,
      dataChangesCount: rowsStats.dataChanges,
    };
  }

  private async getRowsStats(
    fromRevisionId: string,
    toRevisionId: string,
    includeSystem = false,
  ) {
    const result = await this.prisma.$queryRawTyped(
      getRowChangesStatsBetweenRevisions(
        fromRevisionId,
        toRevisionId,
        null as any,
        includeSystem,
      ),
    );

    const row = result[0];

    return {
      total: Number(row?.total ?? 0),
      added: Number(row?.added ?? 0),
      removed: Number(row?.removed ?? 0),
      renamed: Number(row?.renamed ?? 0),
      modified: Number(row?.modified ?? 0),
      schemaChanges: Number(row?.schemaChanges ?? 0),
      dataChanges: Number(row?.dataChanges ?? 0),
    };
  }
}
