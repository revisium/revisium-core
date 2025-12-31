import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetBranchByIdQuery } from 'src/features/branch/quieries/impl/get-branch-by-id.query';
import { GetBranchByIdReturnType } from 'src/features/branch/quieries/types/get-branch-by-id.types';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@QueryHandler(GetBranchByIdQuery)
export class GetBranchByIdHandler
  implements IQueryHandler<GetBranchByIdQuery, GetBranchByIdReturnType>
{
  constructor(private readonly prismaService: TransactionPrismaService) {}

  private get prisma() {
    return this.prismaService.getTransactionOrPrisma();
  }

  execute({ branchId }: GetBranchByIdQuery) {
    return this.prisma.branch.findUniqueOrThrow({ where: { id: branchId } });
  }
}
