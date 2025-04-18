import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { findSchemaForSystemTables } from 'src/features/share/system-tables.consts';
import { getForeignKeysFromSchema } from 'src/features/share/utils/schema/lib/getForeignKeysFromSchema';
import { ResolveTableCountForeignKeysToQuery } from 'src/features/table/queries/impl';

@QueryHandler(ResolveTableCountForeignKeysToQuery)
export class ResolveTableCountForeignKeysToHandler
  implements IQueryHandler<ResolveTableCountForeignKeysToQuery>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly jsonSchemaStore: JsonSchemaStoreService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ data }: ResolveTableCountForeignKeysToQuery) {
    return this.transactionService.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async transactionHandler(
    data: ResolveTableCountForeignKeysToQuery['data'],
  ) {
    const foundSystemMetaSchema = findSchemaForSystemTables(data.tableId);

    if (foundSystemMetaSchema) {
      return 0;
    }

    const { schema } = await this.shareTransactionalQueries.getTableSchema(
      data.revisionId,
      data.tableId,
    );
    const store = this.jsonSchemaStore.create(schema);
    const tableForeignKeys = getForeignKeysFromSchema(store);

    return tableForeignKeys.length;
  }
}
