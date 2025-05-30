import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { ResolveRowForeignKeysByQuery } from 'src/features/row/queries/impl';
import { ResolveRowCountForeignKeysByQuery } from 'src/features/row/queries/impl/resolve-row-count-foreign-keys-by.query';
import { ForeignKeysService } from 'src/features/share/foreign-keys.service';
import { CustomSchemeKeywords } from 'src/features/share/schema/consts';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { getDBJsonPathByJsonSchemaStore } from 'src/features/share/utils/schema/lib/getDBJsonPathByJsonSchemaStore';
import { traverseStore } from 'src/features/share/utils/schema/lib/traverseStore';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';

@QueryHandler(ResolveRowCountForeignKeysByQuery)
export class ResolveRowCountForeignKeysByHandler
  implements IQueryHandler<ResolveRowCountForeignKeysByQuery>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly foreignKeysService: ForeignKeysService,
    private readonly jsonSchemaStore: JsonSchemaStoreService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ data }: ResolveRowForeignKeysByQuery) {
    return this.transactionService.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async transactionHandler(
    data: ResolveRowCountForeignKeysByQuery['data'],
  ) {
    const schemaTable =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        data.revisionId,
        SystemTables.Schema,
      );

    const foreignKeyTableIds = (
      await this.foreignKeysService.findRowsByKeyValueInData(
        schemaTable.versionId,
        CustomSchemeKeywords.ForeignKey,
        data.tableId,
      )
    ).map((row) => row.id);

    const results = await Promise.all(
      foreignKeyTableIds.map((foreignKeyTableId) =>
        this.getCountByForeignKeyTableId(
          data.revisionId,
          data.rowId,
          foreignKeyTableId,
        ),
      ),
    );

    return results.reduce((sum, result) => {
      return sum + result;
    }, 0);
  }

  async getCountByForeignKeyTableId(
    revisionId: string,
    rowId: string,
    foreignKeyTableId: string,
  ) {
    // TODO move to shared

    const foreignKeyTable =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        revisionId,
        foreignKeyTableId,
      );

    const { schema } = await this.shareTransactionalQueries.getTableSchema(
      revisionId,
      foreignKeyTableId,
    );

    const schemaStore = this.jsonSchemaStore.create(schema);

    const paths: string[] = [];

    traverseStore(schemaStore, (item) => {
      if (item.type === JsonSchemaTypeName.String && item.foreignKey) {
        paths.push(getDBJsonPathByJsonSchemaStore(item));
      }
    });

    return this.foreignKeysService.countRowsByPathsAndValueInData(
      foreignKeyTable.versionId,
      paths,
      rowId,
    );
  }
}
