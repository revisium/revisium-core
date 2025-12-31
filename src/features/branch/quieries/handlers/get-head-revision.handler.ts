import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetHeadRevisionQuery } from 'src/features/branch/quieries/impl';
import { GetHeadRevisionReturnType } from 'src/features/branch/quieries/types';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@QueryHandler(GetHeadRevisionQuery)
export class GetHeadRevisionHandler
  implements IQueryHandler<GetHeadRevisionQuery>
{
  constructor(private readonly prismaService: TransactionPrismaService) {}

  private get prisma() {
    return this.prismaService.getTransactionOrPrisma();
  }

  async execute({
    branchId,
  }: GetHeadRevisionQuery): Promise<GetHeadRevisionReturnType> {
    return this.prisma.revision.findFirstOrThrow({
      where: { isHead: true, branchId },
    });
  }
}
