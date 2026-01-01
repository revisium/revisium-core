import { CommandBus, CommandHandler, EventBus } from '@nestjs/cqrs';
import { Row } from 'src/__generated__/client';
import {
  InternalRenameRowCommand,
  InternalRenameRowCommandData,
  InternalRenameRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-rename-row.command';
import { InternalUpdateRowCommand } from 'src/features/draft/commands/impl/transactional/internal-update-row.command';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftRevisionApiService } from 'src/features/draft-revision/draft-revision-api.service';
import { RowRenamedEvent } from 'src/infrastructure/cache';
import { ForeignKeysService } from 'src/features/share/foreign-keys.service';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { CustomSchemeKeywords } from 'src/features/share/schema/consts';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { SystemTables } from 'src/features/share/system-tables.consts';
import {
  createJsonValueStore,
  getDBJsonPathByJsonSchemaStore,
  replaceForeignKeyValue,
  traverseStore,
} from '@revisium/schema-toolkit/lib';
import {
  JsonSchemaStore,
  JsonValueStore,
} from '@revisium/schema-toolkit/model';
import { JsonSchemaTypeName } from '@revisium/schema-toolkit/types';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(InternalRenameRowCommand)
export class InternalRenameRowHandler extends DraftHandler<
  InternalRenameRowCommand,
  InternalRenameRowCommandReturnType
> {
  constructor(
    protected readonly commandBus: CommandBus,
    protected readonly transactionService: TransactionPrismaService,
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
    protected readonly foreignKeysService: ForeignKeysService,
    protected readonly draftContext: DraftContextService,
    protected readonly jsonSchemaStore: JsonSchemaStoreService,
    protected readonly eventBus: EventBus,
    protected readonly draftRevisionApi: DraftRevisionApiService,
  ) {
    super(transactionService, draftContext);
  }

  protected async postActions({ data }: InternalRenameRowCommand) {
    await this.eventBus.publishAll([
      new RowRenamedEvent(
        data.revisionId,
        data.tableId,
        data.rowId,
        data.nextRowId,
      ),
    ]);
  }

  public async handler({
    data: input,
  }: InternalRenameRowCommand): Promise<InternalRenameRowCommandReturnType> {
    const result = await this.draftRevisionApi.renameRows({
      revisionId: input.revisionId,
      tableId: input.tableId,
      renames: [{ rowId: input.rowId, nextRowId: input.nextRowId }],
    });

    await this.updateForeignKeys(input);

    return {
      tableVersionId: result.tableVersionId,
      previousTableVersionId: result.previousTableVersionId,
      rowVersionId: result.renamedRows[0].rowVersionId,
      previousRowVersionId: result.renamedRows[0].previousRowVersionId,
    };
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
}
