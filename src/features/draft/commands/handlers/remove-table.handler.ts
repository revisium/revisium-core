import { BadRequestException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus } from '@nestjs/cqrs';
import {
  CreateRemoveMigrationCommand,
  CreateRemoveMigrationCommandReturnType,
} from 'src/features/draft/commands/impl/migration';
import { TableDeletedEvent } from 'src/infrastructure/cache';
import { DiffService } from 'src/features/share/diff.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { RemoveRowsCommand } from 'src/features/draft/commands/impl/remove-rows.command';
import { RemoveTableCommand } from 'src/features/draft/commands/impl/remove-table.command';
import { RemoveTableHandlerReturnType } from 'src/features/draft/commands/types/remove-table.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { ForeignKeysService } from 'src/features/share/foreign-keys.service';
import { CustomSchemeKeywords } from 'src/features/share/schema/consts';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { SystemTables } from 'src/features/share/system-tables.consts';

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
    protected readonly tableRequestDto: DraftTableRequestDto,
    protected readonly foreignKeysService: ForeignKeysService,
    protected readonly diffService: DiffService,
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
    const table =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        revisionId,
        tableId,
      );

    if (table.system) {
      throw new BadRequestException('Table is a system table');
    }

    await this.validateForeignKeys(data);

    if (table.readonly) {
      await this.disconnectTableFromRevision(table.versionId, revisionId);
    } else {
      await this.removeTable(table.versionId);
    }

    this.tableRequestDto.id = tableId;
    this.tableRequestDto.versionId = table.versionId;

    await this.removeSchema(data);

    await this.validateRevisionHasChanges();

    return {
      branchId: this.revisionRequestDto.branchId,
      revisionId: this.revisionRequestDto.id,
    };
  }

  private async validateRevisionHasChanges() {
    const areThereChangesInRevision = await this.diffService.hasTableDiffs({
      fromRevisionId: this.revisionRequestDto.parentId,
      toRevisionId: this.revisionRequestDto.id,
    });

    await this.transaction.revision.update({
      where: { id: this.revisionRequestDto.id },
      data: { hasChanges: areThereChangesInRevision },
    });
  }

  private removeTable(tableId: string) {
    return this.transaction.table.delete({ where: { versionId: tableId } });
  }

  private async disconnectTableFromRevision(
    tableId: string,
    revisionId: string,
  ) {
    return this.transaction.table.update({
      where: { versionId: tableId },
      data: { revisions: { disconnect: { id: revisionId } } },
    });
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
