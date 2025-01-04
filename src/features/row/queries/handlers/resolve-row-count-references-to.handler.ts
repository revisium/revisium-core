import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { ResolveRowCountReferencesToQuery } from 'src/features/row/queries/impl';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
import {
  getReferencesFromValue,
  GetReferencesFromValueType,
} from 'src/features/share/utils/schema/lib/getReferencesFromValue';
import { JsonValue } from 'src/features/share/utils/schema/types/json.types';
import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';

@QueryHandler(ResolveRowCountReferencesToQuery)
export class ResolveRowCountReferencesToHandler
  implements IQueryHandler<ResolveRowCountReferencesToQuery>
{
  constructor(
    private transactionService: TransactionPrismaService,
    private shareTransactionalQueries: ShareTransactionalQueries,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ data }: ResolveRowCountReferencesToQuery) {
    return this.transactionService.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async transactionHandler(
    data: ResolveRowCountReferencesToQuery['data'],
  ) {
    const rowData = await this.getRowData(data);

    const schema = await this.shareTransactionalQueries.getTableSchema(
      data.revisionId,
      data.tableId,
    );

    const references = this.getReferences(schema, data.rowId, rowData);

    return references.flatMap((reference) => reference.rowIds).length;
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
    data: ResolveRowCountReferencesToQuery['data'],
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
