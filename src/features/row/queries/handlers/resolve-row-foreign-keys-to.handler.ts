import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { PluginService } from 'src/features/plugin/plugin.service';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  ResolveRowForeignKeysToQuery,
  ResolveRowForeignKeysToReturnType,
} from 'src/features/row/queries/impl';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { createJsonValueStore } from '@revisium/schema-toolkit/lib';
import {
  getForeignKeysFromValue,
  GetForeignKeysFromValueType,
} from '@revisium/schema-toolkit/lib';
import { JsonValue } from '@revisium/schema-toolkit/types';
import { JsonSchema } from '@revisium/schema-toolkit/types';

@QueryHandler(ResolveRowForeignKeysToQuery)
export class ResolveRowForeignKeysToHandler
  implements
    IQueryHandler<
      ResolveRowForeignKeysToQuery,
      ResolveRowForeignKeysToReturnType
    >
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly jsonSchemaStore: JsonSchemaStoreService,
    private readonly pluginService: PluginService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: ResolveRowForeignKeysToQuery): Promise<ResolveRowForeignKeysToReturnType> {
    return this.transactionService.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  async getRows(
    args: { take: number; skip: number },
    foundForeignKey: GetForeignKeysFromValueType | undefined,
    foreignKeyTableVersionId: string,
  ) {
    if (!foundForeignKey) {
      return [];
    }

    const foreignKeyRowsIds = foundForeignKey.rowIds.slice(
      args.skip,
      args.skip + args.take,
    );

    return this.transaction.table
      .findUniqueOrThrow({ where: { versionId: foreignKeyTableVersionId } })
      .rows({
        where: {
          OR: foreignKeyRowsIds.map((id) => ({ id })),
        },
        orderBy: {
          id: Prisma.SortOrder.asc,
        },
      });
  }

  private async transactionHandler(data: ResolveRowForeignKeysToQuery['data']) {
    const rowData = await this.getRowData(data);

    const { schema } = await this.shareTransactionalQueries.getTableSchema(
      data.revisionId,
      data.tableId,
    );

    const foreignKeyTable =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        data.revisionId,
        data.foreignKeyToTableId,
      );

    const foreignKeys = this.getForeignKeys(schema, data.rowId, rowData);

    const foundForeignKey = foreignKeys.find(
      (foreignKey) => foreignKey.tableId === data.foreignKeyToTableId,
    );

    return getOffsetPagination({
      pageData: { first: data.first, after: data.after },
      findMany: async (args) => {
        const rows = await this.getRows(
          args,
          foundForeignKey,
          foreignKeyTable.versionId,
        );

        await this.pluginService.computeRows({
          revisionId: data.revisionId,
          tableId: data.foreignKeyToTableId,
          rows,
        });

        return rows.map((row) => ({
          ...row,
          context: {
            revisionId: data.revisionId,
            tableId: data.tableId,
          },
        }));
      },
      count: () => this.getCount(foundForeignKey),
    });
  }

  private async getCount(
    foundForeignKey: GetForeignKeysFromValueType | undefined,
  ) {
    return foundForeignKey?.rowIds.length ?? 0;
  }

  private getForeignKeys(
    schema: JsonSchema,
    rowId: string,
    value: JsonValue,
  ): GetForeignKeysFromValueType[] {
    const schemaStore = this.jsonSchemaStore.create(schema);

    return getForeignKeysFromValue(
      createJsonValueStore(schemaStore, rowId, value),
    );
  }

  private async getRowData(
    data: ResolveRowForeignKeysToQuery['data'],
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
