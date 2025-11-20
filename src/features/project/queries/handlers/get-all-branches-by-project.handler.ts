import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from 'src/__generated__/client';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { GetAllBranchesByProjectQuery } from 'src/features/project/queries/impl';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';

@QueryHandler(GetAllBranchesByProjectQuery)
export class GetAllBranchesByProjectHandler
  implements IQueryHandler<GetAllBranchesByProjectQuery>
{
  constructor(private readonly prisma: PrismaService) {}

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
