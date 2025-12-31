import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DraftRevisionCreateTableCommand } from 'src/features/draft-revision/commands/impl/draft-revision-create-table.command';
import { DraftRevisionCreateTableCommandReturnType } from 'src/features/draft-revision/commands/impl';
import {
  DraftRevisionInternalService,
  DraftRevisionValidationService,
} from 'src/features/draft-revision/services';
import { IdService } from 'src/infrastructure/database/id.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(DraftRevisionCreateTableCommand)
export class DraftRevisionCreateTableHandler
  implements ICommandHandler<DraftRevisionCreateTableCommand>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly idService: IdService,
    private readonly validationService: DraftRevisionValidationService,
    private readonly internalService: DraftRevisionInternalService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: DraftRevisionCreateTableCommand): Promise<DraftRevisionCreateTableCommandReturnType> {
    const { revisionId, tableId, system = false, readonly = false } = data;

    const revision = await this.internalService.findRevisionOrThrow(revisionId);
    this.validationService.ensureDraftRevision(revision);
    this.validationService.ensureValidTableId(tableId);
    await this.ensureTableNotExists(revisionId, tableId);

    const result = await this.createTableInRevision({
      revisionId,
      tableId,
      system,
      readonly,
    });

    await this.internalService.markRevisionAsChanged(revisionId);

    return result;
  }

  private async ensureTableNotExists(
    revisionId: string,
    tableId: string,
  ): Promise<void> {
    const exists = await this.tableExistsInRevision(revisionId, tableId);
    if (exists) {
      throw new BadRequestException(
        'A table with this name already exists in the revision',
      );
    }
  }

  private async tableExistsInRevision(
    revisionId: string,
    tableId: string,
  ): Promise<boolean> {
    const table = await this.transaction.table.findFirst({
      where: {
        id: tableId,
        revisions: {
          some: { id: revisionId },
        },
      },
      select: { versionId: true },
    });
    return table !== null;
  }

  private async createTableInRevision(input: {
    revisionId: string;
    tableId: string;
    system: boolean;
    readonly: boolean;
  }): Promise<DraftRevisionCreateTableCommandReturnType> {
    const tableVersionId = this.idService.generate();
    const tableCreatedId = this.idService.generate();

    await this.transaction.table.create({
      data: {
        versionId: tableVersionId,
        createdId: tableCreatedId,
        id: input.tableId,
        system: input.system,
        readonly: input.readonly,
        revisions: {
          connect: { id: input.revisionId },
        },
      },
      select: { versionId: true },
    });

    return { tableVersionId, tableCreatedId };
  }
}
