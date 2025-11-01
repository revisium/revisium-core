import { BadRequestException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { GetRevisionsByBranchIdQuery } from 'src/features/branch/quieries/impl/get-revisions-by-branch-id.query';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { getRevisionCursorPagination } from 'src/features/share/commands/utils/getRevisionCursorPagination';

@QueryHandler(GetRevisionsByBranchIdQuery)
export class GetRevisionsByBranchIdHandler
  implements IQueryHandler<GetRevisionsByBranchIdQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute({ data }: GetRevisionsByBranchIdQuery) {
    if (data.after && data.before) {
      throw new BadRequestException('Passed after and before at the same time');
    }

    return getRevisionCursorPagination({
      pageData: {
        first: data.first,
        after: data.after,
        before: data.before,
        inclusive: data.inclusive,
      },
      findMany: (args) => this.getRevisions(args, data.branchId),
      resolveSequenceById: (id) => this.resolveSequenceById(id),
      count: () => this.getRevisionsCount(data.branchId),
    });
  }

  private resolveSequenceById(id: string) {
    return this.prisma.revision
      .findUniqueOrThrow({
        where: { id },
        select: { sequence: true },
      })
      .then((result) => result.sequence);
  }

  private getRevisions(
    args: { take: number; skip: number; cursor?: { sequence: number } },
    branchId: string,
  ) {
    return this.prisma.branch
      .findUniqueOrThrow({ where: { id: branchId } })
      .revisions({
        ...args,
        orderBy: {
          sequence: Prisma.SortOrder.asc,
        },
      });
  }

  private getRevisionsCount(branchId: string) {
    return this.prisma.branch
      .findUniqueOrThrow({
        where: { id: branchId },
        include: { _count: { select: { revisions: true } } },
      })
      .then((result) => result._count.revisions);
  }
}
