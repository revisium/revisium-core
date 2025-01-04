import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';
import { getEmptyPaginatedResponse } from 'src/features/share/const';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { findSchemaForSystemTables } from 'src/features/share/system-tables.consts';
import { TableWithContext } from 'src/features/share/types/table-with-context.types';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { getReferencesFromSchema } from 'src/features/share/utils/schema/lib/getReferencesFromSchema';
import { ResolveTableReferencesToQuery } from 'src/features/table/queries/impl';
import { ResolveTableReferencesToReturnType } from 'src/features/table/queries/types';

@QueryHandler(ResolveTableReferencesToQuery)
export class ResolveTableReferencesToHandler
  implements
    IQueryHandler<
      ResolveTableReferencesToQuery,
      ResolveTableReferencesToReturnType
    >
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: ResolveTableReferencesToQuery): Promise<ResolveTableReferencesToReturnType> {
    return this.transactionService.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async transactionHandler(
    data: ResolveTableReferencesToQuery['data'],
  ) {
    const foundSystemMetaSchema = findSchemaForSystemTables(data.tableId);

    if (foundSystemMetaSchema) {
      throw getEmptyPaginatedResponse<TableWithContext>();
    }

    const schema = await this.shareTransactionalQueries.getTableSchema(
      data.revisionId,
      data.tableId,
    );

    const store = createJsonSchemaStore(schema);
    const tableReferences = getReferencesFromSchema(store);
    tableReferences.sort((a, b) => a.localeCompare(b));

    return getOffsetPagination({
      pageData: { first: data.first, after: data.after },
      findMany: (args) =>
        this.getTablesByRevision(args, data.revisionId, tableReferences).then(
          (tables) =>
            tables.map((table) => ({
              ...table,
              context: {
                revisionId: data.revisionId,
              },
            })),
        ),
      count: () => Promise.resolve(tableReferences.length),
    });
  }

  private async getTablesByRevision(
    args: { take: number; skip: number },
    revisionId: string,
    tableReferences: string[],
  ) {
    const referenceTableIds = tableReferences.slice(
      args.skip,
      args.skip + args.take,
    );

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