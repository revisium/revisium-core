import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProjectByBranchQuery } from 'src/features/branch/quieries/impl';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@QueryHandler(GetProjectByBranchQuery)
export class GetProjectByBranchHandler implements IQueryHandler<GetProjectByBranchQuery> {
  constructor(private readonly prismaService: TransactionPrismaService) {}

  private get prisma() {
    return this.prismaService.getTransactionOrPrisma();
  }

  execute({ branchId }: GetProjectByBranchQuery) {
    return this.prisma.branch
      .findUniqueOrThrow({ where: { id: branchId } })
      .project();
  }
}
