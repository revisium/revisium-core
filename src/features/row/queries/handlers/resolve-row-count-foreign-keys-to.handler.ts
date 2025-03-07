import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { ResolveRowCountForeignKeysToQuery } from 'src/features/row/queries/impl';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
import {
  getForeignKeysFromValue,
  GetForeignKeysFromValueType,
} from 'src/features/share/utils/schema/lib/getForeignKeysFromValue';
import { JsonValue } from 'src/features/share/utils/schema/types/json.types';
import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';

@QueryHandler(ResolveRowCountForeignKeysToQuery)
export class ResolveRowCountForeignKeysToHandler
  implements IQueryHandler<ResolveRowCountForeignKeysToQuery>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ data }: ResolveRowCountForeignKeysToQuery) {
    return this.transactionService.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async transactionHandler(
    data: ResolveRowCountForeignKeysToQuery['data'],
  ) {
    const rowData = await this.getRowData(data);

    const { schema } = await this.shareTransactionalQueries.getTableSchema(
      data.revisionId,
      data.tableId,
    );

    const foreignKeys = this.getForeignKeys(schema, data.rowId, rowData);

    return foreignKeys.flatMap((foreignKey) => foreignKey.rowIds).length;
  }

  private getForeignKeys(
    schema: JsonSchema,
    rowId: string,
    value: JsonValue,
  ): GetForeignKeysFromValueType[] {
    const schemaStore = createJsonSchemaStore(schema);

    return getForeignKeysFromValue(
      createJsonValueStore(schemaStore, rowId, value),
    );
  }

  private async getRowData(
    data: ResolveRowCountForeignKeysToQuery['data'],
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
