import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import {
  CreateRenameMigrationCommand,
  CreateRenameMigrationCommandReturnType,
} from 'src/features/draft/commands/impl/migration';
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
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { CustomSchemeKeywords } from 'src/features/share/schema/consts';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { getForeignKeyPatchesFromSchema } from 'src/features/share/utils/schema/lib/getForeignKeyPatchesFromSchema';
import { SchemaTable } from 'src/features/share/utils/schema/lib/schema-table';
import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';
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
    protected readonly jsonSchemaStore: JsonSchemaStoreService,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data,
  }: RenameSchemaCommand): Promise<RenameSchemaCommandReturnType> {
    await this.renameRowInSchemaTable(data);
    await this.updateLinkedSchemas(data);
    await this.createRenameMigration(data);

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
      const { schema, patches } = this.updateForeignKeyInSchema(
        data,
        schemaRow.data as JsonSchema,
      );

      await this.commandBus.execute<
        UpdateSchemaCommand,
        UpdateSchemaCommandReturnType
      >(
        new UpdateSchemaCommand({
          revisionId: data.revisionId,
          tableId: schemaRow.id,
          patches,
          schema,
        }),
      );
    }
  }

  private updateForeignKeyInSchema(
    data: RenameSchemaCommand['data'],
    currentSchema: JsonSchema,
  ) {
    const store = this.jsonSchemaStore.create(currentSchema);
    const foreignKeyPatches = getForeignKeyPatchesFromSchema(store, {
      tableId: data.tableId,
      nextTableId: data.nextTableId,
    });

    const schemaTable = new SchemaTable(
      currentSchema,
      this.jsonSchemaStore.refs,
    );
    schemaTable.applyPatches(foreignKeyPatches);

    return {
      schema: schemaTable.getSchema(),
      patches: foreignKeyPatches,
    };
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

  private createRenameMigration(data: RenameSchemaCommand['data']) {
    return this.commandBus.execute<
      CreateRenameMigrationCommand,
      CreateRenameMigrationCommandReturnType
    >(
      new CreateRenameMigrationCommand({
        revisionId: data.revisionId,
        tableId: data.tableId,
        nextTableId: data.nextTableId,
      }),
    );
  }
}
