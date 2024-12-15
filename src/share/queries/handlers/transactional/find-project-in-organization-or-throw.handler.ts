import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { FindProjectInOrganizationOrThrowQuery } from 'src/share/queries/impl';
import { FindProjectInOrganizationType } from 'src/share/queries/types';

@QueryHandler(FindProjectInOrganizationOrThrowQuery)
export class FindProjectInOrganizationOrThrowHandler
  implements IQueryHandler<FindProjectInOrganizationOrThrowQuery>
{
  constructor(private transactionService: TransactionPrismaService) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: FindProjectInOrganizationOrThrowQuery): Promise<FindProjectInOrganizationType> {
    const existingProject = await this.transaction.project.findUnique({
      where: {
        organizationId_name: {
          organizationId: data.organizationId,
          name: data.projectName,
        },
      },
      select: { id: true },
    });

    if (!existingProject) {
      throw new Error(
        'A project with this name does not exist in the organization',
      );
    }

    return existingProject;
  }
}
