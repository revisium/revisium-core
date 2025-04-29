import { BadRequestException } from '@nestjs/common';
import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import { Row } from '@prisma/client';
import {
  InternalRenameRowCommand,
  InternalRenameRowCommandData,
  InternalRenameRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-rename-row.command';
import { InternalUpdateRowCommand } from 'src/features/draft/commands/impl/transactional/internal-update-row.command';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { DraftRowRequestDto } from 'src/features/draft/draft-request-dto/row-request.dto';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { ForeignKeysService } from 'src/features/share/foreign-keys.service';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { CustomSchemeKeywords } from 'src/features/share/schema/consts';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
import { getDBJsonPathByJsonSchemaStore } from 'src/features/share/utils/schema/lib/getDBJsonPathByJsonSchemaStore';
import { replaceForeignKeyValue } from 'src/features/share/utils/schema/lib/replaceForeignKeyValue';
import { traverseStore } from 'src/features/share/utils/schema/lib/traverseStore';
import { JsonSchemaStore } from 'src/features/share/utils/schema/model/schema/json-schema.store';
import { JsonValueStore } from 'src/features/share/utils/schema/model/value/json-value.store';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

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
    protected readonly jsonSchemaStore: JsonSchemaStoreService,
  ) {
    super(transactionService, draftContext);
  }

  public async handler({
    data: input,
  }: InternalRenameRowCommand): Promise<InternalRenameRowCommandReturnType> {
    await this.validateAndPrepare(input);
    await this.updateForeignKeys(input);
    await this.renameDraftRow(input);

    return this.buildResult();
  }

  private async validateAndPrepare(
    input: InternalRenameRowCommandData,
  ): Promise<void> {
    const { revisionId, tableId, rowId, nextRowId } = input;

    this.validateNextRowId(nextRowId);
    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);
    await this.draftTransactionalCommands.getOrCreateDraftTable(tableId);
    await this.draftTransactionalCommands.getOrCreateDraftRow(rowId);
    await this.checkRowExistence(nextRowId);
  }

  private validateNextRowId(rowId: string): void {
    if (rowId.length < 1) {
      throw new BadRequestException(
        'The length of the row name must be greater than or equal to 1',
      );
    }
  }

  private async checkRowExistence(rowId: string): Promise<void> {
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

  private async updateForeignKeys(
    input: InternalRenameRowCommandData,
  ): Promise<void> {
    const foreignKeyTableIds = await this.getForeignTableIds(input);

    for (const foreignKeyTableId of foreignKeyTableIds) {
      await this.updateForeignKeysInTable(input, foreignKeyTableId);
    }
  }

  private async updateForeignKeysInTable(
    input: InternalRenameRowCommandData,
    foreignKeyTableId: string,
  ): Promise<void> {
    const foreignKeyTable =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        input.revisionId,
        foreignKeyTableId,
      );

    const { schema } = await this.shareTransactionalQueries.getTableSchema(
      input.revisionId,
      foreignKeyTableId,
    );

    const schemaStore = this.jsonSchemaStore.create(schema);
    const foreignPaths = this.getForeignPathsFromSchema(schemaStore);
    const rows = await this.getRowsWithForeignKeys(
      foreignKeyTable.versionId,
      foreignPaths,
      input.rowId,
    );

    await this.updateRowsWithNewForeignKey(
      input,
      foreignKeyTableId,
      rows,
      schemaStore,
    );
  }

  private getForeignPathsFromSchema(schemaStore: JsonSchemaStore): string[] {
    const foreignPaths: string[] = [];

    traverseStore(schemaStore, (item) => {
      if (item.type === JsonSchemaTypeName.String && item.foreignKey) {
        foreignPaths.push(getDBJsonPathByJsonSchemaStore(item));
      }
    });

    return foreignPaths;
  }

  private async getRowsWithForeignKeys(
    tableVersionId: string,
    paths: string[],
    value: string,
  ) {
    return this.foreignKeysService.findRowsByPathsAndValueInData(
      tableVersionId,
      paths,
      value,
    );
  }

  private async updateRowsWithNewForeignKey(
    input: InternalRenameRowCommandData,
    foreignKeyTableId: string,
    rows: Row[],
    schemaStore: JsonSchemaStore,
  ): Promise<void> {
    for (const row of rows) {
      const valueStore = createJsonValueStore(schemaStore, row.id, row.data);
      const wasUpdated = replaceForeignKeyValue({
        valueStore: valueStore,
        foreignKey: input.tableId,
        value: input.rowId,
        nextValue: input.nextRowId,
      });

      if (wasUpdated) {
        await this.updateRow(
          input.revisionId,
          foreignKeyTableId,
          row,
          valueStore,
        );
      }
    }
  }

  private async updateRow(
    revisionId: string,
    tableId: string,
    row: Row,
    valueStore: JsonValueStore,
  ): Promise<void> {
    await this.commandBus.execute(
      new InternalUpdateRowCommand({
        revisionId,
        tableId,
        rowId: row.id,
        schemaHash: row.schemaHash,
        data: valueStore.getPlainValue(),
      }),
    );
  }

  private async getForeignTableIds(
    input: InternalRenameRowCommandData,
  ): Promise<string[]> {
    const schemaTable =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        input.revisionId,
        SystemTables.Schema,
      );

    const rows = await this.foreignKeysService.findRowsByKeyValueInData(
      schemaTable.versionId,
      CustomSchemeKeywords.ForeignKey,
      input.tableId,
    );

    return rows.map((row) => row.id);
  }

  private async renameDraftRow(
    input: InternalRenameRowCommandData,
  ): Promise<void> {
    await this.transaction.row.update({
      where: {
        versionId: this.rowRequestDto.versionId,
      },
      data: {
        updatedAt: new Date(),
        id: input.nextRowId,
      },
      select: {
        versionId: true,
      },
    });
  }

  private buildResult(): InternalRenameRowCommandReturnType {
    return {
      tableVersionId: this.tableRequestDto.versionId,
      previousTableVersionId: this.tableRequestDto.previousVersionId,
      rowVersionId: this.rowRequestDto.versionId,
      previousRowVersionId: this.rowRequestDto.previousVersionId,
    };
  }
}
