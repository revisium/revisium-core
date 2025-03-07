import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';
import { getEmptyPaginatedResponse } from 'src/features/share/const';
import { ForeignKeysService } from 'src/features/share/foreign-keys.service';
import { CustomSchemeKeywords } from 'src/features/share/schema/consts';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import {
  findSchemaForSystemTables,
  SystemTables,
} from 'src/features/share/system-tables.consts';
import { TableWithContext } from 'src/features/share/types/table-with-context.types';
import { ResolveTableForeignKeysByQuery } from 'src/features/table/queries/impl';
import { ResolveTableForeignKeysByReturnType } from 'src/features/table/queries/types';

@QueryHandler(ResolveTableForeignKeysByQuery)
export class ResolveTableForeignKeysByHandler
  implements
    IQueryHandler<
      ResolveTableForeignKeysByQuery,
      ResolveTableForeignKeysByReturnType
    >
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly foreignKeyService: ForeignKeysService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: ResolveTableForeignKeysByQuery): Promise<ResolveTableForeignKeysByReturnType> {
    return this.transactionService.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async transactionHandler(
    data: ResolveTableForeignKeysByQuery['data'],
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
    return this.foreignKeyService.countRowsByKeyValueInData(
      schemaTableVersionId,
      CustomSchemeKeywords.ForeignKey,
      tableId,
    );
  }

  private async getTablesByRevision(
    args: { take: number; skip: number },
    revisionId: string,
    schemaTableVersionId: string,
    tableId: string,
  ) {
    const foreignKeyTableIds = (
      await this.foreignKeyService.findRowsByKeyValueInData(
        schemaTableVersionId,
        CustomSchemeKeywords.ForeignKey,
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
          OR: foreignKeyTableIds.map((id) => ({ id })),
        },
        orderBy: {
          id: Prisma.SortOrder.asc,
        },
      });
  }
}
