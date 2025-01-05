import { BadRequestException } from '@nestjs/common';
import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { CreateTableCommand } from 'src/features/draft/commands/impl/create-table.command';
import { UpdateRowCommand } from 'src/features/draft/commands/impl/update-row.command';
import { UpdateRowsCommand } from 'src/features/draft/commands/impl/transactional/update-rows.command';
import { UpdateTableCommand } from 'src/features/draft/commands/impl/update-table.command';
import { UpdateTableHandlerReturnType } from 'src/features/draft/commands/types/update-table.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { JsonSchemaValidatorService } from 'src/features/draft/json-schema-validator.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { SchemaTable } from 'src/features/share/utils/schema/lib/schema-table';
import { traverseStore } from 'src/features/share/utils/schema/lib/traverseStore';
import { JsonPatch } from 'src/features/share/utils/schema/types/json-patch.types';
import {
  JsonSchema,
  JsonSchemaTypeName,
} from 'src/features/share/utils/schema/types/schema.types';

@CommandHandler(UpdateTableCommand)
export class UpdateTableHandler extends DraftHandler<
  UpdateTableCommand,
  UpdateTableHandlerReturnType
> {
  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly tableRequestDto: DraftTableRequestDto,
    protected readonly commandBus: CommandBus,
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly jsonSchemaValidator: JsonSchemaValidatorService,
  ) {
    super(transactionService, draftContext);
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

    if (this.checkItselfReference(data.tableId, data.patches)) {
      throw new BadRequestException('Itself references is not supported yet');
    }

    if (table.system) {
      throw new BadRequestException('Table is a system table');
    }

    await this.draftTransactionalCommands.getOrCreateDraftTable(tableId);

    const nextTable = await this.createNextTable(data);

    const tableSchema = nextTable.getSchema();
    await this.saveSchema({
      revisionId: data.revisionId,
      tableId: data.tableId,
      schema: nextTable.getSchema(),
    });

    await this.updateRows({
      revisionId: data.revisionId,
      tableId: data.tableId,
      tableSchema,
      rows: nextTable.getRows().map((row) => ({
        rowId: row.id,
        data: row.data as Prisma.InputJsonValue,
      })),
    });

    return {
      tableVersionId: this.tableRequestDto.versionId,
      previousTableVersionId: this.tableRequestDto.previousVersionId,
    };
  }

  private async createNextTable(data: UpdateTableCommand['data']) {
    const currentTableSchema = await this.getTableSchema(data);

    const schemaTable = new SchemaTable(currentTableSchema);

    const rows = await this.getRows(this.tableRequestDto.versionId);
    for (const row of rows) {
      schemaTable.addRow(row.id, row.data);
    }

    schemaTable.applyPatches(data.patches);

    await this.draftTransactionalCommands.validateSchema(
      schemaTable.getSchema(),
    );

    return schemaTable;
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

  private async saveSchema({
    revisionId,
    tableId,
    schema,
  }: CreateTableCommand['data']) {
    await this.commandBus.execute(
      new UpdateRowCommand({
        revisionId,
        tableId: SystemTables.Schema,
        rowId: tableId,
        data: schema,
        skipCheckingNotSystemTable: true,
      }),
    );
  }

  private async updateRows(data: {
    revisionId: string;
    tableId: string;
    tableSchema: JsonSchema;
    rows: { rowId: string; data: Prisma.InputJsonValue }[];
  }) {
    await this.commandBus.execute(
      new UpdateRowsCommand({
        revisionId: data.revisionId,
        tableId: data.tableId,
        tableSchema: data.tableSchema,
        rows: data.rows,
      }),
    );
  }

  private checkItselfReference(tableId: string, patches: JsonPatch[]) {
    for (const patch of patches) {
      if (patch.op === 'replace' || patch.op === 'add') {
        let isThereItselfReference = false;

        try {
          const schemaStore = createJsonSchemaStore(patch.value);
          traverseStore(schemaStore, (item) => {
            if (
              item.type === JsonSchemaTypeName.String &&
              item.reference === tableId
            ) {
              isThereItselfReference = true;
            }
          });
        } catch (e) {
          throw new BadRequestException('Invalid schema', { cause: e });
        }

        if (isThereItselfReference) {
          return true;
        }
      }
    }

    return false;
  }
}
