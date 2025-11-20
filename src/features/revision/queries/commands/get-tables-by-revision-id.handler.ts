import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from 'src/__generated__/client';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { GetTablesByRevisionIdQuery } from 'src/features/revision/queries/impl/get-tables-by-revision-id.query';
import { GetRevisionTablesReturnType } from 'src/features/revision/queries/types';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';

@QueryHandler(GetTablesByRevisionIdQuery)
export class GetTablesByRevisionIdHandler
  implements
    IQueryHandler<GetTablesByRevisionIdQuery, GetRevisionTablesReturnType>
{
  constructor(private readonly prisma: PrismaService) {}

  execute({ data }: GetTablesByRevisionIdQuery) {
    return getOffsetPagination({
      pageData: data,
      findMany: (args) =>
        this.getTablesByRevision(args, data.revisionId).then((tables) =>
          tables.map((table) => ({
            ...table,
            context: { revisionId: data.revisionId },
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
