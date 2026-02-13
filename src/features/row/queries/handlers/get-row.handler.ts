import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PluginService } from 'src/features/plugin/plugin.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  GetRowQuery,
  GetRowQueryReturnType,
} from 'src/features/row/queries/impl/get-row.query';

@QueryHandler(GetRowQuery)
export class GetRowHandler implements IQueryHandler<
  GetRowQuery,
  GetRowQueryReturnType
> {
  constructor(
    private readonly prismaService: TransactionPrismaService,
    private readonly pluginService: PluginService,
  ) {}

  private get prisma() {
    return this.prismaService.getTransactionOrPrisma();
  }

  async execute({ data }: GetRowQuery): Promise<GetRowQueryReturnType> {
    try {
      const row = await this.prisma.row.findFirst({
        where: {
          id: data.rowId,
          tables: {
            some: {
              id: data.tableId,
              revisions: { some: { id: data.revisionId } },
            },
          },
        },
      });

      if (!row) {
        return null;
      }

      const { formulaErrors } = await this.pluginService.computeRows({
        revisionId: data.revisionId,
        tableId: data.tableId,
        rows: [row],
      });

      return {
        ...row,
        context: {
          revisionId: data.revisionId,
          tableId: data.tableId,
        },
        formulaErrors: formulaErrors?.get(row.id),
      };
    } catch {
      return null;
    }
  }
}
