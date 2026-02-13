import { BadRequestException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  GetTableSchemaQuery,
  GetTableSchemaQueryReturnType,
  HistoryPatches,
} from 'src/features/share/queries/impl';
import {
  findSchemaForSystemTables,
  SystemTables,
} from 'src/features/share/system-tables.consts';
import { JsonSchema } from '@revisium/schema-toolkit/types';

@QueryHandler(GetTableSchemaQuery)
export class GetTableSchemaHandler implements IQueryHandler<
  GetTableSchemaQuery,
  GetTableSchemaQueryReturnType
> {
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly prismaService: PrismaService,
  ) {}

  private get prisma() {
    return this.transactionService.getTransactionUnsafe() ?? this.prismaService;
  }

  async execute({ data }: GetTableSchemaQuery) {
    return this.getSchema(data.revisionId, data.tableId);
  }

  private async getSchema(revisionId: string, tableId: string) {
    const systemSchema = findSchemaForSystemTables(tableId);

    if (systemSchema) {
      return {
        schema: systemSchema as JsonSchema,
        hash: '',
        historyPatches: [],
      };
    }

    const result = await this.prisma.row.findFirst({
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
      throw new BadRequestException(
        `Table "${tableId}" does not exist in the revision`,
      );
    }

    return {
      schema: result.data as JsonSchema,
      hash: result.hash,
      historyPatches: result.meta as HistoryPatches[],
    };
  }
}
