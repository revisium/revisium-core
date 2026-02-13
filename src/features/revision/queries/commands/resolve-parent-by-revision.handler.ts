import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ResolveParentByRevisionQuery } from 'src/features/revision/queries/impl/resolve-parent-by-revision.query';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@QueryHandler(ResolveParentByRevisionQuery)
export class ResolveParentByRevisionHandler implements IQueryHandler<ResolveParentByRevisionQuery> {
  constructor(private readonly prismaService: TransactionPrismaService) {}

  private get prisma() {
    return this.prismaService.getTransactionOrPrisma();
  }

  execute({ revisionId }: ResolveParentByRevisionQuery) {
    return this.prisma.revision
      .findUniqueOrThrow({ where: { id: revisionId } })
      .parent();
  }
}
