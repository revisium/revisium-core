import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { GetAllBranchesByProjectQuery } from 'src/project/queries/impl';
import { getOffsetPagination } from 'src/share/commands/utils/getOffsetPagination';

@QueryHandler(GetAllBranchesByProjectQuery)
export class GetAllBranchesByProjectHandler
  implements IQueryHandler<GetAllBranchesByProjectQuery>
{
  constructor(private prisma: PrismaService) {}

  public async execute({ data }: GetAllBranchesByProjectQuery) {
    return getOffsetPagination({
      pageData: data,
      findMany: (args) => this.getBranches(args, data.projectId),
      count: () => this.getBranchesCount(data.projectId),
    });
  }

  private getBranches(args: { take: number; skip: number }, projectId: string) {
    return this.prisma.branch.findMany({
      ...args,
      where: { projectId: projectId },
      orderBy: { createdAt: Prisma.SortOrder.asc },
    });
  }

  private getBranchesCount(projectId: string) {
    return this.prisma.branch.count({
      where: { projectId },
    });
  }
}
