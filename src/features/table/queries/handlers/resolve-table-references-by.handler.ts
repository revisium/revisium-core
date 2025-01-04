import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';
import { getEmptyPaginatedResponse } from 'src/features/share/const';
import { ReferencesService } from 'src/features/share/references.service';
import { CustomSchemeKeywords } from 'src/features/share/schema/consts';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import {
  findSchemaForSystemTables,
  SystemTables,
} from 'src/features/share/system-tables.consts';
import { TableWithContext } from 'src/features/share/types/table-with-context.types';
import { ResolveTableReferencesByQuery } from 'src/features/table/queries/impl';
import { ResolveTableReferencesByReturnType } from 'src/features/table/queries/types';

@QueryHandler(ResolveTableReferencesByQuery)
export class ResolveTableReferencesByHandler
  implements
    IQueryHandler<
      ResolveTableReferencesByQuery,
      ResolveTableReferencesByReturnType
    >
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly referencesService: ReferencesService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: ResolveTableReferencesByQuery): Promise<ResolveTableReferencesByReturnType> {
    return this.transactionService.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async transactionHandler(
    data: ResolveTableReferencesByQuery['data'],
  ) {
    const foundSystemMetaSchema = findSchemaForSystemTables(data.tableId);

    if (foundSystemMetaSchema) {
      return getEmptyPaginatedResponse<TableWithContext>();
    }

    const schemaTable =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        data.revisionId,
        SystemTables.Schema,
      );

    return getOffsetPagination({
      pageData: { first: data.first, after: data.after },
      findMany: (args) =>
        this.getTablesByRevision(
          args,
          data.revisionId,
          schemaTable.versionId,
          data.tableId,
        ).then((tables) =>
          tables.map((table) => ({
            ...table,
            context: {
              revisionId: data.revisionId,
            },
          })),
        ),
      count: () =>
        this.getTablesCountByRevision(schemaTable.versionId, data.tableId),
    });
  }

  private getTablesCountByRevision(
    schemaTableVersionId: string,
    tableId: string,
  ) {
    return this.referencesService.countRowsByKeyValueInData(
      schemaTableVersionId,
      CustomSchemeKeywords.Reference,
      tableId,
    );
  }

  private async getTablesByRevision(
    args: { take: number; skip: number },
    revisionId: string,
    schemaTableVersionId: string,
    tableId: string,
  ) {
    const referenceTableIds = (
      await this.referencesService.findRowsByKeyValueInData(
        schemaTableVersionId,
        CustomSchemeKeywords.Reference,
        tableId,
        args.take,
        args.skip,
      )
    ).map((row) => row.id);

    return this.transaction.revision
      .findUniqueOrThrow({
        where: { id: revisionId },
      })
      .tables({
        where: {
          OR: referenceTableIds.map((id) => ({ id })),
        },
        orderBy: {
          id: Prisma.SortOrder.asc,
        },
      });
  }
}
