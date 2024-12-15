import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/database/prisma.service';
import { GetRootBranchByProjectQuery } from 'src/project/queries/impl';

@QueryHandler(GetRootBranchByProjectQuery)
export class GetRootBranchByProjectHandler
  implements IQueryHandler<GetRootBranchByProjectQuery>
{
  constructor(private prisma: PrismaService) {}

  public async execute({ projectId }: GetRootBranchByProjectQuery) {
    return this.prisma.branch.findFirstOrThrow({
      where: { projectId, isRoot: true },
    });
  }
}
