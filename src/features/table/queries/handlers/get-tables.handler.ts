import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from 'src/__generated__/client';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';
import { GetTablesQuery } from 'src/features/table/queries/impl/get-tables.query';
import { GetTablesReturnType } from 'src/features/table/queries/types';

@QueryHandler(GetTablesQuery)
export class GetTablesHandler
  implements IQueryHandler<GetTablesQuery, GetTablesReturnType>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute({ data }: GetTablesQuery): Promise<GetTablesReturnType> {
    return getOffsetPagination({
      pageData: data,
      findMany: (args) =>
        this.getTablesByRevision(args, data.revisionId).then((tables) =>
          tables.map((table) => ({
            ...table,
            context: {
              revisionId: data.revisionId,
            },
          })),
        ),
      count: () => this.getTablesCountByRevision(data.revisionId),
    });
  }

  private getTablesCountByRevision(revisionId: string) {
    return this.prisma.revision
      .findUniqueOrThrow({
        where: { id: revisionId },
        include: {
          _count: {
            select: { tables: { where: { system: false } } },
          },
        },
      })
      .then((result) => result._count.tables);
  }

  private getTablesByRevision(
    args: { take: number; skip: number },
    revisionId: string,
  ) {
    return this.prisma.revision
      .findUniqueOrThrow({
        where: { id: revisionId },
      })
      .tables({
        ...args,
        where: {
          system: false,
        },
        orderBy: {
          createdAt: Prisma.SortOrder.desc,
        },
      });
  }
}
