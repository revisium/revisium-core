import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import {
  InternalRenameRowCommand,
  InternalRenameRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-rename-row.command';
import {
  RenameSchemaCommand,
  RenameSchemaCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/rename-schema.command';
import {
  UpdateSchemaCommand,
  UpdateSchemaCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/update-schema.command';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { ForeignKeysService } from 'src/features/share/foreign-keys.service';
import { CustomSchemeKeywords } from 'src/features/share/schema/consts';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { getPathByStore } from 'src/features/share/utils/schema/lib/getPathByStore';
import { SchemaTable } from 'src/features/share/utils/schema/lib/schema-table';
import { traverseStore } from 'src/features/share/utils/schema/lib/traverseStore';
import { JsonSchemaStore } from 'src/features/share/utils/schema/model/schema/json-schema.store';
import {
  JsonPatch,
  JsonPatchReplace,
} from 'src/features/share/utils/schema/types/json-patch.types';
import {
  JsonSchema,
  JsonSchemaTypeName,
} from 'src/features/share/utils/schema/types/schema.types';
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
    protected readonly foreignKeysService: ForeignKeysService,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data,
  }: RenameSchemaCommand): Promise<RenameSchemaCommandReturnType> {
    await this.renameRowInSchemaTable(data);
    await this.updateLinkedSchemas(data);

    return true;
  }

  private async updateLinkedSchemas(data: RenameSchemaCommand['data']) {
    const schemaTable =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        data.revisionId,
        SystemTables.Schema,
      );

    const schemaRows = await this.foreignKeysService.findRowsByKeyValueInData(
      schemaTable.versionId,
      CustomSchemeKeywords.ForeignKey,
      data.tableId,
    );

    for (const schemaRow of schemaRows) {
      const currentSchema = schemaRow.data as JsonSchema;

      const store = createJsonSchemaStore(currentSchema);
      const foreignKeyPatches = this.getForeignKeyPatchesFromSchema(
        data,
        store,
      );

      const schemaTable = new SchemaTable(currentSchema);
      schemaTable.applyPatches(foreignKeyPatches);

      await this.commandBus.execute<
        UpdateSchemaCommand,
        UpdateSchemaCommandReturnType
      >(
        new UpdateSchemaCommand({
          revisionId: data.revisionId,
          tableId: schemaRow.id,
          patches: foreignKeyPatches,
          schema: schemaTable.getSchema(),
        }),
      );
    }
  }

  private getForeignKeyPatchesFromSchema(
    data: RenameSchemaCommand['data'],
    store: JsonSchemaStore,
  ) {
    const stores: JsonPatch[] = [];

    traverseStore(store, (item) => {
      if (
        item.type === JsonSchemaTypeName.String &&
        item.foreignKey === data.tableId
      ) {
        item.foreignKey = data.nextTableId;

        const patch: JsonPatchReplace = {
          op: 'replace',
          path: getPathByStore(item),
          value: item.getPlainSchema(),
        };

        stores.push(patch);
      }
    });

    return stores;
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
