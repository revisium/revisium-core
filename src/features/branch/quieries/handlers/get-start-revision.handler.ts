import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetStartRevisionQuery } from 'src/features/branch/quieries/impl';
import { GetStartRevisionReturnType } from 'src/features/branch/quieries/types';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@QueryHandler(GetStartRevisionQuery)
export class GetStartRevisionHandler implements IQueryHandler<GetStartRevisionQuery> {
  constructor(private readonly prismaService: TransactionPrismaService) {}

  private get prisma() {
    return this.prismaService.getTransactionOrPrisma();
  }

  async execute({
    branchId,
  }: GetStartRevisionQuery): Promise<GetStartRevisionReturnType> {
    return this.prisma.revision.findFirstOrThrow({
      where: { isStart: true, branchId },
    });
  }
}
