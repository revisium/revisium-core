import { BadRequestException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus } from '@nestjs/cqrs';
import {
  CreateRemoveMigrationCommand,
  CreateRemoveMigrationCommandReturnType,
} from 'src/features/draft/commands/impl/migration';
import { TableDeletedEvent } from 'src/infrastructure/cache';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { RemoveRowsCommand } from 'src/features/draft/commands/impl/remove-rows.command';
import { RemoveTableCommand } from 'src/features/draft/commands/impl/remove-table.command';
import { RemoveTableHandlerReturnType } from 'src/features/draft/commands/types/remove-table.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { ForeignKeysService } from 'src/features/share/foreign-keys.service';
import { CustomSchemeKeywords } from 'src/features/share/schema/consts';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { DraftRevisionApiService } from 'src/features/draft-revision/draft-revision-api.service';

@CommandHandler(RemoveTableCommand)
export class RemoveTableHandler extends DraftHandler<
  RemoveTableCommand,
  RemoveTableHandlerReturnType
> {
  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly commandBus: CommandBus,
    protected readonly eventBus: EventBus,
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly revisionRequestDto: DraftRevisionRequestDto,
    protected readonly foreignKeysService: ForeignKeysService,
    protected readonly draftRevisionApi: DraftRevisionApiService,
  ) {
    super(transactionService, draftContext);
  }

  protected async postActions({ data }: RemoveTableCommand) {
    await this.eventBus.publishAll([
      new TableDeletedEvent(data.revisionId, data.tableId),
    ]);
  }

  protected async handler({
    data,
  }: RemoveTableCommand): Promise<RemoveTableHandlerReturnType> {
    const { revisionId, tableId } = data;

    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);

    await this.draftTransactionalCommands.validateNotSystemTable(tableId);
    await this.validateForeignKeys(data);

    await this.draftRevisionApi.removeTable({ revisionId, tableId });

    await this.removeSchema(data);

    return {
      branchId: this.revisionRequestDto.branchId,
      revisionId: this.revisionRequestDto.id,
    };
  }

  private async removeSchema(data: RemoveTableCommand['data']) {
    await this.commandBus.execute(
      new RemoveRowsCommand({
        revisionId: data.revisionId,
        tableId: SystemTables.Schema,
        rowIds: [data.tableId],
        avoidCheckingSystemTable: true,
      }),
    );
    await this.removeViewsRow(data);
    await this.createRemoveMigration(data);
  }

  private async removeViewsRow(data: RemoveTableCommand['data']) {
    const viewsRow =
      await this.shareTransactionalQueries.findViewsRowInRevision(
        data.revisionId,
        data.tableId,
      );

    if (!viewsRow) {
      return;
    }

    await this.commandBus.execute(
      new RemoveRowsCommand({
        revisionId: data.revisionId,
        tableId: SystemTables.Views,
        rowIds: [data.tableId],
        avoidCheckingSystemTable: true,
      }),
    );
  }

  private async validateForeignKeys(data: RemoveTableCommand['data']) {
    const schemaTable =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        data.revisionId,
        SystemTables.Schema,
      );

    const rows = await this.foreignKeysService.findRowsByKeyValueInData(
      schemaTable.versionId,
      CustomSchemeKeywords.ForeignKey,
      data.tableId,
    );

    if (rows.length) {
      throw new BadRequestException(
        `There are foreign keys between ${data.tableId} and [${rows.map((row) => row.id).join(', ')}]`,
      );
    }
  }

  private createRemoveMigration(data: RemoveTableCommand['data']) {
    return this.commandBus.execute<
      CreateRemoveMigrationCommand,
      CreateRemoveMigrationCommandReturnType
    >(
      new CreateRemoveMigrationCommand({
        revisionId: data.revisionId,
        tableId: data.tableId,
      }),
    );
  }
}
