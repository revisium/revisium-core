import { BadRequestException, Logger } from '@nestjs/common';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

export abstract class BaseMigrationHandler<
  T extends { data: { revisionId: string } },
> {
  protected constructor(
    protected transactionService: TransactionPrismaService,
  ) {}

  protected readonly logger = new Logger(BaseMigrationHandler.name);

  protected get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute(command: T): Promise<boolean> {
    await this.checkIsDraftRevision(command.data.revisionId);

    if (await this.checkTableExisting(command)) {
      return this.handler(command);
    } else {
      this.logger.error(
        `No table ${SystemTables.Migration} found in draft revision ${command.data.revisionId}`,
      );

      return false;
    }
  }

  protected abstract handler(command: T): Promise<boolean>;

  protected async checkTableExisting(command: T): Promise<boolean> {
    const table = await this.transaction.table.findFirst({
      where: {
        revisions: {
          some: {
            id: command.data.revisionId,
          },
        },
        id: SystemTables.Migration,
      },
      select: {
        createdId: true,
      },
    });

    return Boolean(table);
  }

  protected async checkIsDraftRevision(revisionId: string) {
    const revision = await this.transaction.revision.findUniqueOrThrow({
      where: {
        id: revisionId,
      },
    });

    if (!revision.isDraft) {
      throw new BadRequestException('Revision is not draft revision');
    }
  }
}
