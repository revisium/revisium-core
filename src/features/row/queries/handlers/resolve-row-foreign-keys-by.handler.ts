import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { PluginService } from 'src/features/plugin/plugin.service';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  ResolveRowForeignKeysByQuery,
  ResolveRowForeignKeysByReturnType,
} from 'src/features/row/queries/impl';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';
import { ForeignKeysService } from 'src/features/share/foreign-keys.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { getDBJsonPathByJsonSchemaStore } from 'src/features/share/utils/schema/lib/getDBJsonPathByJsonSchemaStore';
import { traverseStore } from 'src/features/share/utils/schema/lib/traverseStore';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';

@QueryHandler(ResolveRowForeignKeysByQuery)
export class ResolveRowForeignKeysByHandler
  implements
    IQueryHandler<
      ResolveRowForeignKeysByQuery,
      ResolveRowForeignKeysByReturnType
    >
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly foreignKeysService: ForeignKeysService,
    private readonly jsonSchemaStore: JsonSchemaStoreService,
    private readonly pluginService: PluginService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: ResolveRowForeignKeysByQuery): Promise<ResolveRowForeignKeysByReturnType> {
    return this.transactionService.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async transactionHandler(data: ResolveRowForeignKeysByQuery['data']) {
    const jsonPaths = await this.getJsonPaths(
      data.revisionId,
      data.foreignKeyByTableId,
    );

    const foreignKeyTable =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        data.revisionId,
        data.foreignKeyByTableId,
      );

    return getOffsetPagination({
      pageData: { first: data.first, after: data.after },
      findMany: async (args) => {
        const rows = await this.getRows(
          args,
          data.rowId,
          jsonPaths,
          foreignKeyTable.versionId,
        );

        await this.pluginService.computeRows({
          revisionId: data.revisionId,
          tableId: data.foreignKeyByTableId,
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
      count: () =>
        this.getCount(data.rowId, jsonPaths, foreignKeyTable.versionId),
    });
  }

  private async getJsonPaths(revisionId: string, foreignKeyTableId: string) {
    // TODO move to shared
    const { schema } = await this.shareTransactionalQueries.getTableSchema(
      revisionId,
      foreignKeyTableId,
    );

    const schemaStore = this.jsonSchemaStore.create(schema);

    const jsonPaths: string[] = [];

    traverseStore(schemaStore, (item) => {
      if (item.type === JsonSchemaTypeName.String && item.foreignKey) {
        jsonPaths.push(getDBJsonPathByJsonSchemaStore(item));
      }
    });

    return jsonPaths;
  }

  async getRows(
    args: { take: number; skip: number },
    rowId: string,
    jsonPaths: string[],
    foreignKeyTableVersionId: string,
  ) {
    return this.foreignKeysService.findRowsByPathsAndValueInData(
      foreignKeyTableVersionId,
      jsonPaths,
      rowId,
      args.take,
      args.skip,
    );
  }

  async getCount(
    rowId: string,
    jsonPaths: string[],
    foreignKeyTableVersionId: string,
  ) {
    return this.foreignKeysService.countRowsByPathsAndValueInData(
      foreignKeyTableVersionId,
      jsonPaths,
      rowId,
    );
  }
}
