import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import {
  GetRevisionQuery,
  GetRevisionQueryReturnType,
} from 'src/features/revision/queries/impl/get-revision.query';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@QueryHandler(GetRevisionQuery)
export class GetRevisionHandler implements IQueryHandler<
  GetRevisionQuery,
  GetRevisionQueryReturnType
> {
  constructor(private readonly prismaService: TransactionPrismaService) {}

  private get prisma() {
    return this.prismaService.getTransactionOrPrisma();
  }

  execute({ data }: GetRevisionQuery) {
    return this.prisma.revision.findUniqueOrThrow({
      where: { id: data.revisionId },
    });
  }
}
