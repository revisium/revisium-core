import { BadRequestException } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { RemoveRowCommand } from 'src/features/draft/commands/impl/remove-row.command';
import { RemoveRowHandlerReturnType } from 'src/features/draft/commands/types/remove-row.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { DraftRowRequestDto } from 'src/features/draft/draft-request-dto/row-request.dto';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { SessionChangelogService } from 'src/features/draft/session-changelog.service';
import { ReferencesService } from 'src/features/share/references.service';
import { CustomSchemeKeywords } from 'src/features/share/schema/consts';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { getValuePathByStore } from 'src/features/share/utils/schema/lib/getValuePathByStore';
import { traverseStore } from 'src/features/share/utils/schema/lib/traverseStore';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';

@CommandHandler(RemoveRowCommand)
export class RemoveRowHandler extends DraftHandler<
  RemoveRowCommand,
  RemoveRowHandlerReturnType
> {
  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly revisionRequestDto: DraftRevisionRequestDto,
    protected readonly tableRequestDto: DraftTableRequestDto,
    protected readonly rowRequestDto: DraftRowRequestDto,
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly sessionChangelog: SessionChangelogService,
    protected readonly referencesService: ReferencesService,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data: input,
  }: RemoveRowCommand): Promise<RemoveRowHandlerReturnType> {
    const { revisionId, tableId, rowId, avoidCheckingSystemTable } = input;

    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);
    if (!avoidCheckingSystemTable) {
      await this.draftTransactionalCommands.validateNotSystemTable(tableId);
    }

    if (!avoidCheckingSystemTable) {
      await this.validateReferences(input);
    }

    await this.draftTransactionalCommands.getOrCreateDraftTable(tableId);

    const row = await this.shareTransactionalQueries.findRowInTableOrThrow(
      this.tableRequestDto.versionId,
      rowId,
    );

    await this.disconnectRow(row.versionId);

    this.rowRequestDto.id = rowId;
    this.rowRequestDto.versionId = row.versionId;

    const isNewRow = await this.sessionChangelog.checkRowInserts(rowId);

    let wasTableReset = false;

    if (isNewRow) {
      await this.updateChangelogForNewRow();
      wasTableReset = await this.resetTableIfNecessary();
      await this.calculateHasChangesForChangelog();
    } else {
      await this.updateChangelogForRow();
    }

    return {
      branchId: this.revisionRequestDto.branchId,
      tableVersionId: wasTableReset
        ? undefined
        : this.tableRequestDto.versionId,
      previousTableVersionId: wasTableReset
        ? undefined
        : this.tableRequestDto.previousVersionId,
    };
  }

  private async resetTableIfNecessary() {
    if (await this.checkWasLastChangeInTable()) {
      await this.revertTable();
      return true;
    }

    return false;
  }

  private async checkWasLastChangeInTable() {
    await this.sessionChangelog.checkTableExistence('rowInserts');

    const noRowChangesDetected =
      !(await this.sessionChangelog.checkTableExistence('rowInserts')) &&
      !(await this.sessionChangelog.checkTableExistence('rowUpdates')) &&
      !(await this.sessionChangelog.checkTableExistence('rowDeletes'));

    const isChangedTable =
      await this.sessionChangelog.checkTableExistence('tableUpdates');

    const isSchemaChangedForTable =
      await this.sessionChangelog.checkRowExistence({
        changelogId: this.revisionRequestDto.changelogId,
        tableId: SystemTables.Schema,
        rowId: this.tableRequestDto.id,
        type: 'rowUpdates',
      });

    if (noRowChangesDetected && isChangedTable && !isSchemaChangedForTable) {
      await this.sessionChangelog.removeTable('tableUpdates');

      await this.transaction.changelog.update({
        where: { id: this.revisionRequestDto.changelogId },
        data: {
          tableUpdatesCount: {
            decrement: 1,
          },
        },
      });

      return true;
    }
  }

  private async calculateHasChangesForChangelog() {
    // TODO copy from remove-table
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

  private async updateChangelogForNewRow() {
    await this.sessionChangelog.removeRow('rowInserts');

    const countRows = await this.sessionChangelog.getCountRows('rowInserts');
    if (!countRows) {
      await this.sessionChangelog.removeTable('rowInserts');
    }

    await this.transaction.changelog.update({
      where: { id: this.revisionRequestDto.changelogId },
      data: {
        rowInsertsCount: {
          decrement: 1,
        },
      },
    });
  }

  private async updateChangelogForRow() {
    const countRows = await this.sessionChangelog.getCountRows('rowDeletes');

    if (!countRows) {
      await this.sessionChangelog.addTableForRow('rowDeletes');
    }

    await this.sessionChangelog.addRow('rowDeletes');

    await this.transaction.changelog.update({
      where: { id: this.revisionRequestDto.changelogId },
      data: {
        rowDeletesCount: {
          increment: 1,
        },
        hasChanges: true,
      },
    });
  }

  private disconnectRow(rowId: string) {
    return this.transaction.table.update({
      where: {
        versionId: this.tableRequestDto.versionId,
      },
      data: {
        rows: {
          disconnect: {
            versionId: rowId,
          },
        },
      },
    });
  }

  private async revertTable() {
    const headRevision =
      await this.shareTransactionalQueries.findHeadRevisionInBranchOrThrow(
        this.revisionRequestDto.branchId,
      );

    const draftRevision =
      await this.shareTransactionalQueries.findDraftRevisionInBranchOrThrow(
        this.revisionRequestDto.branchId,
      );

    const tableInHead =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        headRevision.id,
        this.tableRequestDto.id,
      );

    const tableInDraft =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        draftRevision.id,
        this.tableRequestDto.id,
      );

    await this.transaction.revision.update({
      where: { id: draftRevision.id },
      data: {
        tables: {
          disconnect: {
            versionId: tableInDraft.versionId,
          },
          connect: {
            versionId: tableInHead.versionId,
          },
        },
      },
    });
  }

  private async validateReferences(data: RemoveRowCommand['data']) {
    const schemaTable =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        data.revisionId,
        SystemTables.Schema,
      );

    const referenceTableIds = (
      await this.referencesService.findRowsByKeyValueInData(
        schemaTable.versionId,
        CustomSchemeKeywords.Reference,
        data.tableId,
      )
    ).map((row) => row.id);

    for (const referenceTableId of referenceTableIds) {
      // TODO move to shared

      const referenceTable =
        await this.shareTransactionalQueries.findTableInRevisionOrThrow(
          data.revisionId,
          referenceTableId,
        );

      const schema = await this.shareTransactionalQueries.getTableSchema(
        data.revisionId,
        referenceTableId,
      );

      const schemaStore = createJsonSchemaStore(schema);

      const paths: string[] = [];

      traverseStore(schemaStore, (item) => {
        if (item.type === JsonSchemaTypeName.String && item.reference) {
          paths.push(getValuePathByStore(item));
        }
      });

      const count = await this.referencesService.countRowsByPathsAndValueInData(
        referenceTable.versionId,
        paths,
        data.rowId,
      );

      if (count) {
        throw new BadRequestException(`The row is related to other rows`);
      }
    }
  }
}
