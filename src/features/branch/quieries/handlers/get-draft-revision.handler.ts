import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetDraftRevisionQuery } from 'src/features/branch/quieries/impl';
import { GetDraftRevisionTypes } from 'src/features/branch/quieries/types';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@QueryHandler(GetDraftRevisionQuery)
export class GetDraftRevisionHandler
  implements IQueryHandler<GetDraftRevisionQuery>
{
  constructor(private readonly prismaService: TransactionPrismaService) {}

  private get prisma() {
    return this.prismaService.getTransactionOrPrisma();
  }

  async execute({
    branchId,
  }: GetDraftRevisionQuery): Promise<GetDraftRevisionTypes> {
    return this.prisma.revision.findFirstOrThrow({
      where: { isDraft: true, branchId },
    });
  }
}
