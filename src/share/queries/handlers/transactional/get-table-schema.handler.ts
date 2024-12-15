import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { GetTableSchemaQuery } from 'src/share/queries/impl';
import { SystemTables } from 'src/share/system-tables.consts';
import { JsonSchema } from 'src/share/utils/schema/types/schema.types';

@QueryHandler(GetTableSchemaQuery)
export class GetTableSchemaHandler
  implements IQueryHandler<GetTableSchemaQuery>
{
  constructor(private readonly transactionService: TransactionPrismaService) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ data }: GetTableSchemaQuery): Promise<JsonSchema> {
    return this.getSchema(data.revisionId, data.tableId);
  }

  private async getSchema(revisionId: string, tableId: string) {
    const result = await this.transaction.row.findFirst({
      where: {
        id: tableId,
        tables: {
          some: {
            id: SystemTables.Schema,
            revisions: {
              some: {
                id: revisionId,
              },
            },
          },
        },
      },
      select: {
        data: true,
      },
    });

    if (!result) {
      throw new Error(
        `Not found schema for ${tableId} in revision=${revisionId}`,
      );
    }

    return result.data as JsonSchema;
  }
}
