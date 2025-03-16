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

    await this.validateForeignKeys(data);

    if (table.readonly) {
      await this.disconnectTableFromRevision(table.versionId, revisionId);
    } else {
      await this.removeTable(table.versionId);

      const isThereTableInHeadRevision = await this.isThereTableInHeadRevision(
        data.tableId,
      );

      if (!isThereTableInHeadRevision) {
        await this.validateRevisionHasChanges(revisionId);
      }
    }

    this.tableRequestDto.id = tableId;
    this.tableRequestDto.versionId = table.versionId;

    await this.removeSchema({ revisionId, tableId });

    return {
      branchId: this.revisionRequestDto.branchId,
      revisionId: this.revisionRequestDto.id,
    };
  }

  private async validateRevisionHasChanges(revisionId: string) {
    const firstDraftTable = await this.transaction.table.findFirst({
      where: {
        readonly: false,
        revisions: { some: { id: this.revisionRequestDto.parentId } },
      },
      select: {
        id: true,
      },
    });

    if (!firstDraftTable) {
      await this.transaction.revision.update({
        where: { id: revisionId },
        data: { hasChanges: false },
      });
    }
  }

  private async isThereTableInHeadRevision(tableId: string) {
    const tableInHeadRevision = await this.transaction.table.findFirst({
      where: {
        id: tableId,
        revisions: { some: { id: this.revisionRequestDto.parentId } },
      },
      select: {
        id: true,
      },
    });

    return Boolean(tableInHeadRevision);
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
}
