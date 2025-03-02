import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import {
  InternalRenameRowCommand,
  InternalRenameRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-rename-row.command';
import {
  RenameSchemaCommand,
  RenameSchemaCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/rename-schema.command';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(RenameSchemaCommand)
export class RenameSchemaHandler extends DraftHandler<
  RenameSchemaCommand,
  RenameSchemaCommandReturnType
> {
  constructor(
    protected readonly commandBus: CommandBus,
    protected readonly transactionService: TransactionPrismaService,
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
    protected readonly draftContext: DraftContextService,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data: input,
  }: RenameSchemaCommand): Promise<RenameSchemaCommandReturnType> {
    await this.renameRowInSchemaTable(input);

    return true;
  }

  private renameRowInSchemaTable(data: RenameSchemaCommand['data']) {
    return this.commandBus.execute<
      InternalRenameRowCommand,
      InternalRenameRowCommandReturnType
    >(
      new InternalRenameRowCommand({
        revisionId: data.revisionId,
        tableId: SystemTables.Schema,
        rowId: data.tableId,
        nextRowId: data.nextTableId,
      }),
    );
  }
}
