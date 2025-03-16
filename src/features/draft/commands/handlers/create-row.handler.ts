import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import { CreateRowCommand } from 'src/features/draft/commands/impl/create-row.command';
import {
  InternalCreateRowCommand,
  InternalCreateRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-create-row.command';
import { CreateRowHandlerReturnType } from 'src/features/draft/commands/types/create-row.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(CreateRowCommand)
export class CreateRowHandler extends DraftHandler<
  CreateRowCommand,
  CreateRowHandlerReturnType
> {
  constructor(
    protected readonly commandBus: CommandBus,
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data: input,
  }: CreateRowCommand): Promise<CreateRowHandlerReturnType> {
    const { revisionId, tableId, rowId, data } = input;

    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);
    await this.draftTransactionalCommands.validateNotSystemTable(tableId);
    const { schemaHash } = await this.draftTransactionalCommands.validateData({
      revisionId,
      tableId,
      rows: [{ rowId, data }],
    });
    await this.updateRevision(revisionId);

    return this.createRow(input, schemaHash);
  }

  private async updateRevision(revisionId: string) {
    return this.transaction.revision.update({
      where: { id: revisionId, hasChanges: false },
      data: {
        hasChanges: true,
      },
    });
  }

  private createRow(data: CreateRowCommand['data'], schemaHash: string) {
    return this.commandBus.execute<
      InternalCreateRowCommand,
      InternalCreateRowCommandReturnType
    >(
      new InternalCreateRowCommand({
        revisionId: data.revisionId,
        tableId: data.tableId,
        rowId: data.rowId,
        data: data.data,
        schemaHash,
      }),
    );
  }
}
