import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import {
  InternalCreateRowCommand,
  InternalCreateRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-create-row.command';
import { IdService } from 'src/infrastructure/database/id.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { CreateRowCommand } from 'src/features/draft/commands/impl/create-row.command';
import { CreateRowHandlerReturnType } from 'src/features/draft/commands/types/create-row.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

@CommandHandler(CreateRowCommand)
export class CreateRowHandler extends DraftHandler<
  CreateRowCommand,
  CreateRowHandlerReturnType
> {
  constructor(
    protected readonly commandBus: CommandBus,
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly revisionRequestDto: DraftRevisionRequestDto,
    protected readonly tableRequestDto: DraftTableRequestDto,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
    protected readonly idService: IdService,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data: input,
  }: CreateRowCommand): Promise<CreateRowHandlerReturnType> {
    const { revisionId, tableId, rowId, data, skipCheckingNotSystemTable } =
      input;

    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);

    await this.draftTransactionalCommands.validateData({
      revisionId,
      tableId,
      rows: [{ rowId, data }],
      skipReferenceValidation: skipCheckingNotSystemTable,
    });

    if (!skipCheckingNotSystemTable) {
      await this.draftTransactionalCommands.validateNotSystemTable(tableId);
    }

    return this.createRow(input);
  }

  private createRow(data: CreateRowCommand['data']) {
    return this.commandBus.execute<
      InternalCreateRowCommand,
      InternalCreateRowCommandReturnType
    >(new InternalCreateRowCommand(data));
  }
}
