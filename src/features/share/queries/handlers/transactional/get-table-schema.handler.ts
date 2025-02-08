import { InternalServerErrorException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  GetTableSchemaQuery,
  GetTableSchemaQueryReturnType,
  HistoryPatches,
} from 'src/features/share/queries/impl';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';

@QueryHandler(GetTableSchemaQuery)
export class GetTableSchemaHandler
  implements IQueryHandler<GetTableSchemaQuery, GetTableSchemaQueryReturnType>
{
  constructor(private readonly transactionService: TransactionPrismaService) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ data }: GetTableSchemaQuery) {
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
        hash: true,
        meta: true,
      },
    });

    if (!result) {
      throw new InternalServerErrorException(
        `Not found schema for ${tableId} in revision=${revisionId}`,
      );
    }

    return {
      schema: result.data as JsonSchema,
      hash: result.hash,
      historyPatches: result.meta as HistoryPatches[],
    };
  }
}
