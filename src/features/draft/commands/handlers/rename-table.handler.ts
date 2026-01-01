import { CommandBus, CommandHandler, EventBus } from '@nestjs/cqrs';
import {
  RenameTableCommand,
  RenameTableCommandReturnType,
} from 'src/features/draft/commands/impl/rename-table.command';
import {
  RenameSchemaCommand,
  RenameSchemaCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/rename-schema.command';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { TableRenamedEvent } from 'src/infrastructure/cache';
import { DraftRevisionApiService } from 'src/features/draft-revision/draft-revision-api.service';

@CommandHandler(RenameTableCommand)
export class RenameTableHandler extends DraftHandler<
  RenameTableCommand,
  RenameTableCommandReturnType
> {
  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly commandBus: CommandBus,
    protected readonly eventBus: EventBus,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly draftRevisionApi: DraftRevisionApiService,
  ) {
    super(transactionService, draftContext);
  }

  protected async postActions({ data }: RenameTableCommand) {
    await this.eventBus.publishAll([
      new TableRenamedEvent(data.revisionId, data.tableId, data.nextTableId),
    ]);
  }

  protected async handler({
    data,
  }: RenameTableCommand): Promise<RenameTableCommandReturnType> {
    const { revisionId, tableId, nextTableId } = data;

    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);

    await this.draftTransactionalCommands.validateNotSystemTable(tableId);

    const result = await this.draftRevisionApi.renameTable({
      revisionId,
      tableId,
      nextTableId,
    });

    await this.renameSchema(data);

    return {
      tableVersionId: result.tableVersionId,
      previousTableVersionId: result.previousTableVersionId,
    };
  }

  private renameSchema(data: RenameTableCommand['data']) {
    return this.commandBus.execute<
      RenameSchemaCommand,
      RenameSchemaCommandReturnType
    >(new RenameSchemaCommand(data));
  }
}
