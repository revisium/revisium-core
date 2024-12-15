import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { ShareTransactionalQueries } from 'src/share/share.transactional.queries';
import { findSchemaForSystemTables } from 'src/share/system-tables.consts';
import { ResolveTableSchemaQuery } from 'src/table/queries/impl';

@QueryHandler(ResolveTableSchemaQuery)
export class ResolveTableSchemaHandler
  implements IQueryHandler<ResolveTableSchemaQuery>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ data }: ResolveTableSchemaQuery): Promise<Prisma.JsonValue> {
    return this.transactionService.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async transactionHandler(data: ResolveTableSchemaQuery['data']) {
    const foundSystemMetaSchema = findSchemaForSystemTables(data.tableId);

    if (foundSystemMetaSchema) {
      return foundSystemMetaSchema;
    }

    return this.shareTransactionalQueries.getTableSchema(
      data.revisionId,
      data.tableId,
    );
  }
}
