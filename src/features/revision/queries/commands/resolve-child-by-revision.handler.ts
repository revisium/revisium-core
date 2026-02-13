import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ResolveChildByRevisionQuery } from 'src/features/revision/queries/impl/resolve-child-by-revision.query';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@QueryHandler(ResolveChildByRevisionQuery)
export class ResolveChildByRevisionHandler implements IQueryHandler<ResolveChildByRevisionQuery> {
  constructor(private readonly prismaService: TransactionPrismaService) {}

  private get prisma() {
    return this.prismaService.getTransactionOrPrisma();
  }

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
