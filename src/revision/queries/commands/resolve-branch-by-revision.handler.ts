import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/database/prisma.service';
import { ResolveBranchByRevisionQuery } from 'src/revision/queries/impl/resolve-branch-by-revision.query';

@QueryHandler(ResolveBranchByRevisionQuery)
export class ResolveBranchByRevisionHandler
  implements IQueryHandler<ResolveBranchByRevisionQuery>
{
  constructor(private prisma: PrismaService) {}

  execute({ revisionId }: ResolveBranchByRevisionQuery) {
    return this.prisma.revision
      .findUniqueOrThrow({ where: { id: revisionId } })
      .branch();
  }
}
