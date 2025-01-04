import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { GetProjectQuery } from 'src/features/project/queries/impl';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

@QueryHandler(GetProjectQuery)
export class GetProjectHandler implements IQueryHandler<GetProjectQuery> {
  constructor(
    private transactionPrisma: TransactionPrismaService,
    private shareTransactionalQueries: ShareTransactionalQueries,
  ) {}

  private get transaction() {
    return this.transactionPrisma.getTransaction();
  }

  execute({ data }: GetProjectQuery) {
    return this.transactionPrisma.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async transactionHandler(data: GetProjectQuery['data']) {
    const { id: projectId } =
      await this.shareTransactionalQueries.findProjectInOrganizationOrThrow(
        data.organizationId,
        data.projectName,
      );

    return this.transaction.project.findUniqueOrThrow({
      where: { id: projectId },
    });
  }
}
