import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { ResolveChildBranchesByRevisionQuery } from 'src/features/revision/queries/impl';

@QueryHandler(ResolveChildBranchesByRevisionQuery)
export class ResolveChildBranchesByRevisionHandler
  implements IQueryHandler<ResolveChildBranchesByRevisionQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  public async execute({
    revisionId,
  }: ResolveChildBranchesByRevisionQuery): Promise<
    {
      branch: { id: string };
      revision: { id: string };
    }[]
  > {
    const revision = await this.getRevision(revisionId);

    const revisions = await this.getChildRevisionsFromOtherBranches(
      revision.branchId,
      revisionId,
    );

    return revisions.map((revision) => ({
      branch: {
        id: revision.branchId,
      },
      revision: {
        id: revision.id,
      },
    }));
  }

  private getRevision(revisionId: string) {
    return this.prisma.revision.findUniqueOrThrow({
      where: { id: revisionId },
      select: { branchId: true },
    });
  }

  private getChildRevisionsFromOtherBranches(
    branchId: string,
    parentRevisionId: string,
  ) {
    return this.prisma.revision.findMany({
      where: { parentId: parentRevisionId, NOT: { branchId } },
      select: {
        id: true,
        branchId: true,
      },
    });
  }
}
