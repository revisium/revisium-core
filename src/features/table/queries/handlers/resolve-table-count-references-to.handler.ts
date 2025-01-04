import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { findSchemaForSystemTables } from 'src/features/share/system-tables.consts';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { getReferencesFromSchema } from 'src/features/share/utils/schema/lib/getReferencesFromSchema';
import { ResolveTableCountReferencesToQuery } from 'src/features/table/queries/impl';

@QueryHandler(ResolveTableCountReferencesToQuery)
export class ResolveTableCountReferencesToHandler
  implements IQueryHandler<ResolveTableCountReferencesToQuery>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ data }: ResolveTableCountReferencesToQuery) {
    return this.transactionService.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async transactionHandler(
    data: ResolveTableCountReferencesToQuery['data'],
  ) {
    const foundSystemMetaSchema = findSchemaForSystemTables(data.tableId);

    if (foundSystemMetaSchema) {
      return 0;
    }

    const schema = await this.shareTransactionalQueries.getTableSchema(
      data.revisionId,
      data.tableId,
    );
    const store = createJsonSchemaStore(schema);
    const tableReferences = getReferencesFromSchema(store);

    return tableReferences.length;
  }
}
