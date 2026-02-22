import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { UpdateProjectCommand } from 'src/features/project/commands/impl';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

@CommandHandler(UpdateProjectCommand)
export class UpdateProjectHandler implements ICommandHandler<
  UpdateProjectCommand,
  boolean
> {
  constructor(
    private readonly transactionPrisma: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
  ) {}

  private get transaction() {
    return this.transactionPrisma.getTransaction();
  }

  public async execute({ data }: UpdateProjectCommand): Promise<boolean> {
    return this.transactionPrisma.runSerializable(() =>
      this.transactionHandler(data),
    );
  }

  private async transactionHandler(data: UpdateProjectCommand['data']) {
    const { organizationId, projectName } = data;

    const { id: projectId } =
      await this.shareTransactionalQueries.findProjectInOrganizationOrThrow(
        organizationId,
        projectName,
      );

    await this.updateProject(projectId, data.isPublic);

    return true;
  }

  private updateProject(projectId: string, isPublic: boolean) {
    return this.transaction.project.update({
      where: { id: projectId },
      data: {
        isPublic,
      },
    });
  }
}
