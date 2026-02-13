import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { GetRootBranchByProjectQuery } from 'src/features/project/queries/impl';

@QueryHandler(GetRootBranchByProjectQuery)
export class GetRootBranchByProjectHandler implements IQueryHandler<GetRootBranchByProjectQuery> {
  constructor(private readonly prisma: PrismaService) {}

  public async execute({ projectId }: GetRootBranchByProjectQuery) {
    return this.prisma.branch.findFirstOrThrow({
      where: { projectId, isRoot: true },
    });
  }
}
