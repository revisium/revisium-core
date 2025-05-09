import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { PluginService } from 'src/features/plugin/plugin.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';
import { GetRowsByTableQuery } from 'src/features/table/queries/impl/get-rows-by-table.query';
import { GetTableRowsReturnType } from 'src/features/table/queries/types';

@QueryHandler(GetRowsByTableQuery)
export class GetRowsByTableHandler
  implements IQueryHandler<GetRowsByTableQuery, GetTableRowsReturnType>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly pluginService: PluginService,
  ) {}

  execute({ data }: GetRowsByTableQuery) {
    return getOffsetPagination({
      pageData: data,
      findMany: async (args) => {
        const rows = await this.getRows(args, data.tableVersionId);

        await this.pluginService.computeRows({
          revisionId: data.revisionId,
          tableId: data.tableId,
          rows,
        });

        return rows.map((row) => ({
          ...row,
          context: {
            revisionId: data.revisionId,
            tableId: data.tableId,
          },
        }));
      },
      count: () => this.getRowsCount(data.tableVersionId),
    });
  }

  private getRows(
    args: { take: number; skip: number },
    tableVersionId: string,
  ) {
    return this.prisma.table
      .findUniqueOrThrow({ where: { versionId: tableVersionId } })
      .rows({
        ...args,
        orderBy: {
          createdAt: Prisma.SortOrder.desc,
        },
      });
  }

  private getRowsCount(tableId: string) {
    return this.prisma.table
      .findUniqueOrThrow({
        where: { versionId: tableId },
        include: { _count: { select: { rows: true } } },
      })
      .then((result) => result._count.rows);
  }
}
