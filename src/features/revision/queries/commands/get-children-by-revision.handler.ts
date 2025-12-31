import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetChildrenByRevisionQuery } from 'src/features/revision/queries/impl/get-children-by-revision.query';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@QueryHandler(GetChildrenByRevisionQuery)
export class GetChildrenByRevisionHandler
  implements IQueryHandler<GetChildrenByRevisionQuery>
{
  constructor(private readonly prismaService: TransactionPrismaService) {}

  private get prisma() {
    return this.prismaService.getTransactionOrPrisma();
  }

  execute({ revisionId }: GetChildrenByRevisionQuery) {
    return this.prisma.revision
      .findUniqueOrThrow({ where: { id: revisionId } })
      .children();
  }
}
