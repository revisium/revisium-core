import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { ResolveRowReferencesByQuery } from 'src/features/row/queries/impl';
import { ResolveRowReferencesByReturnType } from 'src/features/row/queries/types';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';
import { ReferencesService } from 'src/features/share/references.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { getValuePathByStore } from 'src/features/share/utils/schema/lib/getValuePathByStore';
import { traverseStore } from 'src/features/share/utils/schema/lib/traverseStore';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';

@QueryHandler(ResolveRowReferencesByQuery)
export class ResolveRowReferencesByHandler
  implements
    IQueryHandler<
      ResolveRowReferencesByQuery,
      ResolveRowReferencesByReturnType
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
  }: ResolveRowReferencesByQuery): Promise<ResolveRowReferencesByReturnType> {
    return this.transactionService.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async transactionHandler(data: ResolveRowReferencesByQuery['data']) {
    const jsonPaths = await this.getJsonPaths(
      data.revisionId,
      data.referenceByTableId,
    );

    const referenceTable =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        data.revisionId,
        data.referenceByTableId,
      );

    return getOffsetPagination({
      pageData: { first: data.first, after: data.after },
      findMany: (args) =>
        this.getRows(
          args,
          data.rowId,
          jsonPaths,
          referenceTable.versionId,
        ).then((rows) =>
          rows.map((row) => ({
            ...row,
            context: {
              revisionId: data.revisionId,
              tableId: data.tableId,
            },
          })),
        ),
      count: () =>
        this.getCount(data.rowId, jsonPaths, referenceTable.versionId),
    });
  }

  private async getJsonPaths(revisionId: string, referenceTableId: string) {
    // TODO move to shared
    const schema = await this.shareTransactionalQueries.getTableSchema(
      revisionId,
      referenceTableId,
    );

    const schemaStore = createJsonSchemaStore(schema);

    const jsonPaths: string[] = [];

    traverseStore(schemaStore, (item) => {
      if (item.type === JsonSchemaTypeName.String && item.reference) {
        jsonPaths.push(getValuePathByStore(item));
      }
    });

    return jsonPaths;
  }

  async getRows(
    args: { take: number; skip: number },
    rowId: string,
    jsonPaths: string[],
    referenceTableVersionId: string,
  ) {
    return this.referencesService.findRowsByPathsAndValueInData(
      referenceTableVersionId,
      jsonPaths,
      rowId,
      args.take,
      args.skip,
    );
  }

  async getCount(
    rowId: string,
    jsonPaths: string[],
    referenceTableVersionId: string,
  ) {
    return this.referencesService.countRowsByPathsAndValueInData(
      referenceTableVersionId,
      jsonPaths,
      rowId,
    );
  }
}
