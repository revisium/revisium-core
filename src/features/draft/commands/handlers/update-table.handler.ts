import { BadRequestException } from '@nestjs/common';
import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import {
  UpdateSchemaCommand,
  UpdateSchemaCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/update-schema.command';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { UpdateRowsCommand } from 'src/features/draft/commands/impl/transactional/update-rows.command';
import { UpdateTableCommand } from 'src/features/draft/commands/impl/update-table.command';
import { UpdateTableHandlerReturnType } from 'src/features/draft/commands/types/update-table.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { JsonSchemaValidatorService } from 'src/features/draft/json-schema-validator.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
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

    if (this.checkItselfForeignKey(data.tableId, data.patches)) {
      throw new BadRequestException('Itself foreign key is not supported yet');
    }

    if (table.system) {
      throw new BadRequestException('Table is a system table');
    }

    await this.draftTransactionalCommands.getOrCreateDraftTable(tableId);

    const nextTable = await this.createNextTable(data);

    const tableSchema = nextTable.getSchema();
    await this.updateSchema(data, nextTable.getSchema());

    const { hash: nextSchemaHash } = await this.getTableSchema(data);
    await this.updateRows({
      revisionId: data.revisionId,
      tableId: data.tableId,
      tableSchema,
      schemaHash: nextSchemaHash,
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
    const { schema } = await this.getTableSchema(data);

    const schemaTable = new SchemaTable(schema);

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
        schema,
        patches: data.patches,
      }),
    );
  }

  private async updateRows(data: {
    revisionId: string;
    tableId: string;
    tableSchema: JsonSchema;
    schemaHash: string;
    rows: { rowId: string; data: Prisma.InputJsonValue }[];
  }) {
    await this.commandBus.execute(
      new UpdateRowsCommand({
        revisionId: data.revisionId,
        tableId: data.tableId,
        tableSchema: data.tableSchema,
        rows: data.rows,
        schemaHash: data.schemaHash,
      }),
    );
  }

  private checkItselfForeignKey(tableId: string, patches: JsonPatch[]) {
    for (const patch of patches) {
      if (patch.op === 'replace' || patch.op === 'add') {
        let isThereItselfForeignKey = false;

        const schemaStore = createJsonSchemaStore(patch.value);
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
}
