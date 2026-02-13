import { BadRequestException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { FindProjectInOrganizationOrThrowQuery } from 'src/features/share/queries/impl';
import { FindProjectInOrganizationType } from 'src/features/share/queries/types';

@QueryHandler(FindProjectInOrganizationOrThrowQuery)
export class FindProjectInOrganizationOrThrowHandler implements IQueryHandler<FindProjectInOrganizationOrThrowQuery> {
  constructor(private readonly transactionService: TransactionPrismaService) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: FindProjectInOrganizationOrThrowQuery): Promise<FindProjectInOrganizationType> {
    const existingProject = await this.transaction.project.findFirst({
      where: {
        organizationId: data.organizationId,
        name: data.projectName,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!existingProject) {
      throw new BadRequestException(
        'A project with this name does not exist in the organization',
      );
    }

    return existingProject;
  }
}
