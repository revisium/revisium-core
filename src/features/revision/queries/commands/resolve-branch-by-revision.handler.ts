import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ResolveBranchByRevisionQuery } from 'src/features/revision/queries/impl/resolve-branch-by-revision.query';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@QueryHandler(ResolveBranchByRevisionQuery)
export class ResolveBranchByRevisionHandler
  implements IQueryHandler<ResolveBranchByRevisionQuery>
{
  constructor(private readonly prismaService: TransactionPrismaService) {}

  private get prisma() {
    return this.prismaService.getTransactionOrPrisma();
  }

  execute({ revisionId }: ResolveBranchByRevisionQuery) {
    return this.prisma.revision
      .findUniqueOrThrow({ where: { id: revisionId } })
      .branch();
  }
}
