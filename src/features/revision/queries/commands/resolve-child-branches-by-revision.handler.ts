import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ResolveChildBranchesByRevisionQuery } from 'src/features/revision/queries/impl';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@QueryHandler(ResolveChildBranchesByRevisionQuery)
export class ResolveChildBranchesByRevisionHandler
  implements IQueryHandler<ResolveChildBranchesByRevisionQuery>
{
  constructor(private readonly prismaService: TransactionPrismaService) {}

  private get prisma() {
    return this.prismaService.getTransactionOrPrisma();
  }

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
