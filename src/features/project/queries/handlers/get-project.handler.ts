import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  GetProjectQuery,
  GetProjectQueryData,
  GetProjectQueryReturnType,
} from 'src/features/project/queries/impl';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

@QueryHandler(GetProjectQuery)
export class GetProjectHandler implements IQueryHandler<
  GetProjectQuery,
  GetProjectQueryReturnType
> {
  constructor(
    private readonly transactionPrisma: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
  ) {}

  private get transaction() {
    return this.transactionPrisma.getTransaction();
  }

  execute({ data }: GetProjectQuery) {
    return this.transactionPrisma.runSerializable(
      () => this.transactionHandler(data),
    );
  }

  private async transactionHandler(data: GetProjectQueryData) {
    const { id: projectId } =
      await this.shareTransactionalQueries.findProjectInOrganizationOrThrow(
        data.organizationId,
        data.projectName,
      );

    return this.transaction.project.findUniqueOrThrow({
      where: { id: projectId, isDeleted: false },
    });
  }
}
