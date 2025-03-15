import { BadRequestException } from '@nestjs/common';
import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import { InternalUpdateRowCommand } from 'src/features/draft/commands/impl/transactional/internal-update-row.command';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import {
  InternalRenameRowCommand,
  InternalRenameRowCommandData,
  InternalRenameRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-rename-row.command';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
import { DraftRowRequestDto } from 'src/features/draft/draft-request-dto/row-request.dto';
import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
import { replaceForeignKeyValue } from 'src/features/share/utils/schema/lib/replaceForeignKeyValue';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { ForeignKeysService } from 'src/features/share/foreign-keys.service';
import { CustomSchemeKeywords } from 'src/features/share/schema/consts';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { traverseStore } from 'src/features/share/utils/schema/lib/traverseStore';
import { getValuePathByStore } from 'src/features/share/utils/schema/lib/getValuePathByStore';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { DraftContextService } from 'src/features/draft/draft-context.service';

@CommandHandler(InternalRenameRowCommand)
export class InternalRenameRowHandler extends DraftHandler<
  InternalRenameRowCommand,
  InternalRenameRowCommandReturnType
> {
  constructor(
    protected readonly commandBus: CommandBus,
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly revisionRequestDto: DraftRevisionRequestDto,
    protected readonly tableRequestDto: DraftTableRequestDto,
    protected readonly rowRequestDto: DraftRowRequestDto,
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
    protected readonly foreignKeysService: ForeignKeysService,
    protected readonly draftContext: DraftContextService,
  ) {
    super(transactionService, draftContext);
  }

  public async handler({
    data: input,
  }: InternalRenameRowCommand): Promise<InternalRenameRowCommandReturnType> {
    const { revisionId, tableId, rowId, nextRowId } = input;

    this.validateNextRowId(nextRowId);
    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);
    await this.draftTransactionalCommands.getOrCreateDraftTable(tableId);
    await this.draftTransactionalCommands.getOrCreateDraftRow(rowId);

    await this.checkRowExistence(nextRowId);
    await this.renameFieldsInForeignRows(input);

    await this.renameDraftRow(input);

    return {
      tableVersionId: this.tableRequestDto.versionId,
      previousTableVersionId: this.tableRequestDto.previousVersionId,
      rowVersionId: this.rowRequestDto.versionId,
      previousRowVersionId: this.rowRequestDto.previousVersionId,
    };
  }

  private validateNextRowId(rowId: string) {
    if (rowId.length < 1) {
      throw new BadRequestException(
        'The length of the row name must be greater than or equal to 1',
      );
    }
  }

  private async checkRowExistence(rowId: string) {
    const existingRow = await this.transaction.row.findFirst({
      where: {
        id: rowId,
        tables: {
          some: {
            versionId: this.tableRequestDto.versionId,
          },
        },
      },
      select: { versionId: true },
    });

    if (existingRow) {
      throw new BadRequestException(
        `A row with this name = ${rowId} already exists in the table`,
      );
    }
  }

  private async renameFieldsInForeignRows(data: InternalRenameRowCommandData) {
    const foreignKeyTableIds = await this.getForeignTableIds(data);

    for (const foreignKeyTableId of foreignKeyTableIds) {
      const foreignKeyTable =
        await this.shareTransactionalQueries.findTableInRevisionOrThrow(
          data.revisionId,
          foreignKeyTableId,
        );

      const { schema } = await this.shareTransactionalQueries.getTableSchema(
        data.revisionId,
        foreignKeyTableId,
      );

      const schemaStore = createJsonSchemaStore(schema);

      const foreignPathsInSchema: string[] = [];

      traverseStore(schemaStore, (item) => {
        if (item.type === JsonSchemaTypeName.String && item.foreignKey) {
          foreignPathsInSchema.push(getValuePathByStore(item));
        }
      });

      const rows = await this.foreignKeysService.findRowsByPathsAndValueInData(
        foreignKeyTable.versionId,
        foreignPathsInSchema,
        data.rowId,
      );

      for (const row of rows) {
        const valueStore = createJsonValueStore(schemaStore, row.id, row.data);

        const wasUpdated = replaceForeignKeyValue({
          valueStore: valueStore,
          foreignKey: data.tableId,
          value: data.rowId,
          nextValue: data.nextRowId,
        });

        if (wasUpdated) {
          await this.commandBus.execute(
            new InternalUpdateRowCommand({
              revisionId: data.revisionId,
              tableId: foreignKeyTableId,
              rowId: row.id,
              schemaHash: row.schemaHash,
              data: valueStore.getPlainValue(),
            }),
          );
        }
      }
    }
  }

  private async getForeignTableIds(data: InternalRenameRowCommandData) {
    const schemaTable =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        data.revisionId,
        SystemTables.Schema,
      );

    return (
      await this.foreignKeysService.findRowsByKeyValueInData(
        schemaTable.versionId,
        CustomSchemeKeywords.ForeignKey,
        data.tableId,
      )
    ).map((row) => row.id);
  }

  private async renameDraftRow(input: InternalRenameRowCommandData) {
    return this.transaction.row.update({
      where: {
        versionId: this.rowRequestDto.versionId,
      },
      data: {
        id: input.nextRowId,
      },
      select: {
        versionId: true,
      },
    });
  }
}
