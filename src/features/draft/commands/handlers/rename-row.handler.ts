import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import {
  RenameRowCommand,
  RenameRowCommandReturnType,
} from 'src/features/draft/commands/impl/rename-row.command';
import {
  InternalRenameRowCommand,
  InternalRenameRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-rename-row.command';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';

@CommandHandler(RenameRowCommand)
export class RenameRowHandler extends DraftHandler<
  RenameRowCommand,
  RenameRowCommandReturnType
> {
  constructor(
    protected readonly commandBus: CommandBus,
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly tableRequestDto: DraftTableRequestDto,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data: input,
  }: RenameRowCommand): Promise<RenameRowCommandReturnType> {
    const { revisionId, tableId } = input;

    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);
    await this.draftTransactionalCommands.validateNotSystemTable(tableId);
    await this.updateRevision(revisionId);

    return this.renameRow(input);
  }

  private async updateRevision(revisionId: string) {
    return this.transaction.revision.updateMany({
      where: { id: revisionId, hasChanges: false },
      data: {
        hasChanges: true,
      },
    });
  }

  private renameRow(data: RenameRowCommand['data']) {
    return this.commandBus.execute<
      InternalRenameRowCommand,
      InternalRenameRowCommandReturnType
    >(
      new InternalRenameRowCommand({
        revisionId: data.revisionId,
        tableId: data.tableId,
        rowId: data.rowId,
        nextRowId: data.nextRowId,
      }),
    );
  }
}
