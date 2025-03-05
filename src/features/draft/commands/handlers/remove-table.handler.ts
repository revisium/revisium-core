import { BadRequestException } from '@nestjs/common';
import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { RemoveRowCommand } from 'src/features/draft/commands/impl/remove-row.command';
import { RemoveTableCommand } from 'src/features/draft/commands/impl/remove-table.command';
import { RemoveTableHandlerReturnType } from 'src/features/draft/commands/types/remove-table.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { SessionChangelogService } from 'src/features/draft/session-changelog.service';
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
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly revisionRequestDto: DraftRevisionRequestDto,
    protected readonly tableRequestDto: DraftTableRequestDto,
    protected readonly sessionChangelog: SessionChangelogService,
    protected readonly foreignKeysService: ForeignKeysService,
  ) {
    super(transactionService, draftContext);
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

    await this.validateForegeinKeys(data);

    if (table.readonly) {
      await this.disconnectTableFromRevision(table.versionId, revisionId);
    } else {
      await this.removeTable(table.versionId);
    }

    this.tableRequestDto.id = tableId;
    this.tableRequestDto.versionId = table.versionId;

    const isNewTable =
      await this.sessionChangelog.checkTableExistence('tableInserts');
    if (isNewTable) {
      await this.updateChangelogForNewTable();
    } else {
      await this.updateChangelogForTable();
    }
    await this.revertRowsInChangelog();
    await this.calculateHasChangesForChangelog();

    await this.removeSchema({ revisionId, tableId });

    return {
      branchId: this.revisionRequestDto.branchId,
      revisionId: this.revisionRequestDto.id,
    };
  }

  private async updateChangelogForNewTable() {
    await this.sessionChangelog.removeTable('tableInserts');

    await this.transaction.changelog.update({
      where: { id: this.revisionRequestDto.changelogId },
      data: {
        tableInsertsCount: {
          decrement: 1,
        },
      },
    });
  }

  private async updateChangelogForTable() {
    await this.sessionChangelog.addTable('tableDeletes');

    await this.transaction.changelog.update({
      where: { id: this.revisionRequestDto.changelogId },
      data: {
        tableDeletesCount: {
          increment: 1,
        },
      },
    });
  }

  private async revertRowsInChangelog() {
    const decrementRowInsertsCount =
      await this.sessionChangelog.getCountRows('rowInserts');
    const decrementRowUpdatesCount =
      await this.sessionChangelog.getCountRows('rowUpdates');
    const decrementRowDeletesCount =
      await this.sessionChangelog.getCountRows('rowDeletes');

    await this.sessionChangelog.removeTable('rowInserts');
    await this.sessionChangelog.removeTable('rowUpdates');
    await this.sessionChangelog.removeTable('rowDeletes');

    await this.transaction.changelog.update({
      where: { id: this.revisionRequestDto.changelogId },
      data: {
        rowInsertsCount: {
          decrement: decrementRowInsertsCount,
        },
        rowUpdatesCount: {
          decrement: decrementRowUpdatesCount,
        },
        rowDeletesCount: {
          decrement: decrementRowDeletesCount,
        },
      },
    });
  }

  private async calculateHasChangesForChangelog() {
    const {
      tableInsertsCount,
      rowInsertsCount,
      tableUpdatesCount,
      rowUpdatesCount,
      tableDeletesCount,
      rowDeletesCount,
    } = await this.transaction.changelog.findUniqueOrThrow({
      where: { id: this.revisionRequestDto.changelogId },
      select: {
        tableInsertsCount: true,
        rowInsertsCount: true,
        tableUpdatesCount: true,
        rowUpdatesCount: true,
        tableDeletesCount: true,
        rowDeletesCount: true,
      },
    });

    const hasChanges = Boolean(
      tableInsertsCount ||
        rowInsertsCount ||
        tableUpdatesCount ||
        rowUpdatesCount ||
        tableDeletesCount ||
        rowDeletesCount,
    );

    await this.transaction.changelog.update({
      where: { id: this.revisionRequestDto.changelogId },
      data: {
        hasChanges,
      },
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

  private async removeSchema({
    revisionId,
    tableId,
  }: RemoveTableCommand['data']) {
    await this.commandBus.execute(
      new RemoveRowCommand({
        revisionId,
        tableId: SystemTables.Schema,
        rowId: tableId,
        avoidCheckingSystemTable: true,
      }),
    );
  }

  private async validateForegeinKeys(data: RemoveTableCommand['data']) {
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
}
