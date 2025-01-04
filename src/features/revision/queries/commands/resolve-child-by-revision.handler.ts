import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { ResolveChildByRevisionQuery } from 'src/features/revision/queries/impl/resolve-child-by-revision.query';

@QueryHandler(ResolveChildByRevisionQuery)
export class ResolveChildByRevisionHandler
  implements IQueryHandler<ResolveChildByRevisionQuery>
{
  constructor(private prisma: PrismaService) {}

  public async execute({ revisionId }: ResolveChildByRevisionQuery) {
    const revision = await this.getRevision(revisionId);

    return this.getChildRevision(revision.branchId, revisionId);
  }

  private getRevision(revisionId: string) {
    return this.prisma.revision.findUniqueOrThrow({
      where: { id: revisionId },
      select: { branchId: true },
    });
  }

  private getChildRevision(branchId: string, parentRevisionId: string) {
    return this.prisma.revision.findFirst({
      where: { parentId: parentRevisionId, branchId },
    });
  }
}
