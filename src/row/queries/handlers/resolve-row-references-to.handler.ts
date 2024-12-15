import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { ResolveRowReferencesToQuery } from 'src/row/queries/impl';
import { ResolveRowReferencesToReturnType } from 'src/row/queries/types';
import { getOffsetPagination } from 'src/share/commands/utils/getOffsetPagination';
import { ShareTransactionalQueries } from 'src/share/share.transactional.queries';
import { createJsonSchemaStore } from 'src/share/utils/schema/lib/createJsonSchemaStore';
import { createJsonValueStore } from 'src/share/utils/schema/lib/createJsonValueStore';
import {
  getReferencesFromValue,
  GetReferencesFromValueType,
} from 'src/share/utils/schema/lib/getReferencesFromValue';
import { JsonValue } from 'src/share/utils/schema/types/json.types';
import { JsonSchema } from 'src/share/utils/schema/types/schema.types';

@QueryHandler(ResolveRowReferencesToQuery)
export class ResolveRowReferencesToHandler
  implements
    IQueryHandler<
      ResolveRowReferencesToQuery,
      ResolveRowReferencesToReturnType
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
  }: ResolveRowReferencesToQuery): Promise<ResolveRowReferencesToReturnType> {
    return this.transactionService.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  async getRows(
    args: { take: number; skip: number },
    foundReference: GetReferencesFromValueType | undefined,
    referenceTableVersionId: string,
  ) {
    if (!foundReference) {
      return [];
    }

    const referenceRowsIds = foundReference.rowIds.slice(
      args.skip,
      args.skip + args.take,
    );

    return this.transaction.table
      .findUniqueOrThrow({ where: { versionId: referenceTableVersionId } })
      .rows({
        where: {
          OR: referenceRowsIds.map((id) => ({ id })),
        },
        orderBy: {
          id: Prisma.SortOrder.asc,
        },
      });
  }

  private async transactionHandler(data: ResolveRowReferencesToQuery['data']) {
    const rowData = await this.getRowData(data);

    const schema = await this.shareTransactionalQueries.getTableSchema(
      data.revisionId,
      data.tableId,
    );

    const referenceTable =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        data.revisionId,
        data.referenceByTableId,
      );

    const references = this.getReferences(schema, data.rowId, rowData);

    const foundReference = references.find(
      (reference) => reference.tableId === data.referenceByTableId,
    );

    return getOffsetPagination({
      pageData: { first: data.first, after: data.after },
      findMany: (args) =>
        this.getRows(args, foundReference, referenceTable.versionId).then(
          (rows) =>
            rows.map((row) => ({
              ...row,
              context: {
                revisionId: data.revisionId,
                tableId: data.tableId,
              },
            })),
        ),
      count: () => this.getCount(foundReference),
    });
  }

  private async getCount(
    foundReference: GetReferencesFromValueType | undefined,
  ) {
    return foundReference?.rowIds.length || 0;
  }

  private getReferences(
    schema: JsonSchema,
    rowId: string,
    value: JsonValue,
  ): GetReferencesFromValueType[] {
    const schemaStore = createJsonSchemaStore(schema);

    return getReferencesFromValue(
      createJsonValueStore(schemaStore, rowId, value),
    );
  }

  private async getRowData(
    data: ResolveRowReferencesToQuery['data'],
  ): Promise<JsonValue> {
    // TODO move to shared
    const { versionId: tableVersionId } =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        data.revisionId,
        data.tableId,
      );

    const { versionId: rowVersionId } =
      await this.shareTransactionalQueries.findRowInTableOrThrow(
        tableVersionId,
        data.rowId,
      );

    const row = await this.transaction.row.findUniqueOrThrow({
      where: { versionId: rowVersionId },
    });

    return row.data;
  }
}
