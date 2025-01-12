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
    await this.draftTransactionalCommands.validateData({
      revisionId,
      tableId,
      rows: [{ rowId, data }],
    });

    return this.createRow(input);
  }

  private createRow(data: CreateRowCommand['data']) {
    return this.commandBus.execute<
      InternalCreateRowCommand,
      InternalCreateRowCommandReturnType
    >(new InternalCreateRowCommand(data));
  }
}
