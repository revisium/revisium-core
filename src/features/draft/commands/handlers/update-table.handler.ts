import { BadRequestException } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus } from '@nestjs/cqrs';
import { Prisma, Row } from 'src/__generated__/client';
import {
  UpdateSchemaCommand,
  UpdateSchemaCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/update-schema.command';
import { PluginService } from 'src/features/plugin/plugin.service';
import { TableSchemaUpdatedEvent } from 'src/infrastructure/cache';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { InternalUpdateRowCommand } from 'src/features/draft/commands/impl/transactional/internal-update-row.command';
import {
  InternalUpdateRowsCommand,
  InternalUpdateRowsCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-update-rows.command';
import { UpdateTableCommand } from 'src/features/draft/commands/impl/update-table.command';
import { UpdateTableHandlerReturnType } from 'src/features/draft/commands/types/update-table.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { JsonSchemaValidatorService } from 'src/features/share/json-schema-validator.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import {
  ViewsMigrationError,
  ViewsMigrationService,
} from 'src/features/share/views-migration.service';
import { tableViewsSchema } from 'src/features/share/schema/table-views-schema';
import { TableViewsData } from 'src/features/views/types';
import { SchemaTable, traverseStore } from '@revisium/schema-toolkit/lib';
import {
  JsonPatch,
  JsonSchema,
  JsonSchemaTypeName,
} from '@revisium/schema-toolkit/types';

@CommandHandler(UpdateTableCommand)
export class UpdateTableHandler extends DraftHandler<
  UpdateTableCommand,
  UpdateTableHandlerReturnType
> {
  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly commandBus: CommandBus,
    protected readonly eventBus: EventBus,
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly jsonSchemaValidator: JsonSchemaValidatorService,
    protected readonly jsonSchemaStore: JsonSchemaStoreService,
    protected readonly pluginTable: PluginService,
    protected readonly viewsMigrationService: ViewsMigrationService,
  ) {
    super(transactionService, draftContext);
  }

  protected async postActions({ data }: UpdateTableCommand) {
    await this.eventBus.publishAll([
      new TableSchemaUpdatedEvent(data.revisionId, data.tableId),
    ]);
  }

  protected async validations({ data }: UpdateTableCommand) {
    if (data.patches.length < 1) {
      throw new BadRequestException('Invalid length of patches');
    }

    await this.validatePatchSchema(data.patches);
  }

  protected async handler({
    data,
  }: UpdateTableCommand): Promise<UpdateTableHandlerReturnType> {
    const { revisionId, tableId } = data;

    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);
    await this.validations({ data });

    const table =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        revisionId,
        tableId,
      );

    if (this.checkItselfForeignKey(data.tableId, data.patches)) {
      throw new BadRequestException('Itself foreign key is not supported yet');
    }

    if (table.system) {
      throw new BadRequestException('Table is a system table');
    }

    const { schema: previousSchema } = await this.getTableSchema(data);
    const { tableSchema, rows } = await this.createNextTable(
      data,
      table.versionId,
    );

    await this.updateSchema(data, tableSchema);

    const { hash: nextSchemaHash } = await this.getTableSchema(data);
    const updateResult = await this.updateRows({
      revisionId: data.revisionId,
      tableId: data.tableId,
      tableSchema,
      schemaHash: nextSchemaHash,
      rows,
    });

    await this.migrateViews(revisionId, tableId, data.patches, previousSchema);

    return {
      tableVersionId: updateResult.tableVersionId,
      previousTableVersionId: updateResult.previousTableVersionId,
    };
  }

  private async createNextTable(
    data: UpdateTableCommand['data'],
    tableVersionId: string,
  ) {
    const { schema } = await this.getTableSchema(data);

    const schemaTable = new SchemaTable(schema, this.jsonSchemaStore.refs);

    const rows = await this.getRows(tableVersionId);
    for (const row of rows) {
      schemaTable.addRow(row.id, row.data);
    }

    schemaTable.applyPatches(data.patches);

    await this.draftTransactionalCommands.validateSchema(
      schemaTable.getSchema(),
    );

    const patchedRows = new Map(
      schemaTable.getRows().map((row) => [row.id, row.data]),
    );
    for (const row of rows) {
      const patchRow = patchedRows.get(row.id);
      if (!patchRow) {
        throw new BadRequestException(`Patch row not found for ${row.id}`);
      }
      row.data = patchRow;
    }

    return {
      tableSchema: schemaTable.getSchema(),
      rows,
    };
  }

  private async getTableSchema(data: UpdateTableCommand['data']) {
    return this.shareTransactionalQueries.getTableSchema(
      data.revisionId,
      data.tableId,
    );
  }

  private getRows(tableVersionId: string) {
    return this.transaction.table
      .findUniqueOrThrow({
        where: { versionId: tableVersionId },
      })
      .rows({
        orderBy: {
          id: Prisma.SortOrder.asc,
        },
      });
  }

  private async validatePatchSchema(patches: JsonPatch[]) {
    const { result, errors } =
      this.jsonSchemaValidator.validateJsonPatchSchema(patches);

    if (!result) {
      throw new BadRequestException('patches is not valid', {
        cause: errors,
      });
    }

    for (const patch of patches) {
      if (patch.op === 'replace' || patch.op === 'add') {
        await this.draftTransactionalCommands.validateSchema(patch.value);
      }
    }
  }

  private async updateSchema(
    data: UpdateTableCommand['data'],
    schema: Prisma.InputJsonValue,
  ) {
    return this.commandBus.execute<
      UpdateSchemaCommand,
      UpdateSchemaCommandReturnType
    >(
      new UpdateSchemaCommand({
        revisionId: data.revisionId,
        tableId: data.tableId,
        schema: schema as JsonSchema,
        patches: data.patches,
      }),
    );
  }

  private async updateRows(data: {
    revisionId: string;
    tableId: string;
    tableSchema: JsonSchema;
    schemaHash: string;
    rows: Row[];
  }): Promise<InternalUpdateRowsCommandReturnType> {
    await this.pluginTable.afterMigrateRows({
      revisionId: data.revisionId,
      tableId: data.tableId,
      rows: data.rows,
    });

    return this.commandBus.execute<
      InternalUpdateRowsCommand,
      InternalUpdateRowsCommandReturnType
    >(
      new InternalUpdateRowsCommand({
        revisionId: data.revisionId,
        tableId: data.tableId,
        tableSchema: data.tableSchema,
        rows: data.rows.map((row) => ({
          rowId: row.id,
          data: row.data as Prisma.InputJsonValue,
        })),
        schemaHash: data.schemaHash,
      }),
    );
  }

  private checkItselfForeignKey(tableId: string, patches: JsonPatch[]) {
    for (const patch of patches) {
      if (patch.op === 'replace' || patch.op === 'add') {
        let isThereItselfForeignKey = false;

        const schemaStore = this.jsonSchemaStore.create(patch.value);
        traverseStore(schemaStore, (item) => {
          if (
            item.type === JsonSchemaTypeName.String &&
            item.foreignKey === tableId
          ) {
            isThereItselfForeignKey = true;
          }
        });

        if (isThereItselfForeignKey) {
          return true;
        }
      }
    }

    return false;
  }

  private async migrateViews(
    revisionId: string,
    tableId: string,
    patches: JsonPatch[],
    previousSchema: JsonSchema,
  ): Promise<void> {
    const viewsTable = await this.shareTransactionalQueries.findTableInRevision(
      revisionId,
      SystemTables.Views,
    );

    if (!viewsTable) {
      return;
    }

    const viewsRow = await this.findViewsRow(viewsTable.versionId, tableId);
    if (!viewsRow) {
      return;
    }

    const viewsData = viewsRow.data as unknown as TableViewsData;

    try {
      const migratedViewsData = this.viewsMigrationService.migrateViews(
        {
          viewsData,
          patches,
          previousSchema,
        },
        { revisionId, tableId },
      );

      const schemaHash =
        this.jsonSchemaValidator.getSchemaHash(tableViewsSchema);

      await this.commandBus.execute(
        new InternalUpdateRowCommand({
          revisionId,
          tableId: SystemTables.Views,
          rowId: tableId,
          data: migratedViewsData as unknown as Prisma.InputJsonValue,
          schemaHash,
        }),
      );
    } catch (error) {
      if (error instanceof ViewsMigrationError) {
        throw new BadRequestException(
          `Views migration failed for table "${tableId}" in revision "${revisionId}": ${error.message}`,
          {
            cause: {
              revisionId: error.context.revisionId,
              tableId: error.context.tableId,
              ...error.details,
            },
          },
        );
      }
      throw error;
    }
  }

  private async findViewsRow(tableVersionId: string, rowId: string) {
    return this.transaction.row.findFirst({
      where: {
        id: rowId,
        tables: {
          some: {
            versionId: tableVersionId,
          },
        },
      },
    });
  }
}
