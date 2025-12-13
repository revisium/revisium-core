import { BadRequestException } from '@nestjs/common';
import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import { Prisma } from 'src/__generated__/client';
import { InternalCreateRowCommand } from 'src/features/draft/commands/impl/transactional/internal-create-row.command';
import { InternalUpdateRowCommand } from 'src/features/draft/commands/impl/transactional/internal-update-row.command';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { JsonSchemaValidatorService } from 'src/features/share/json-schema-validator.service';
import { tableViewsSchema } from 'src/features/share/schema/table-views-schema';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { SystemTablesService } from 'src/features/share/system-tables.service';
import {
  UpdateTableViewsCommand,
  UpdateTableViewsCommandReturnType,
} from 'src/features/views/commands/impl';
import { ViewValidationService } from 'src/features/views/services';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(UpdateTableViewsCommand)
export class UpdateTableViewsHandler extends DraftHandler<
  UpdateTableViewsCommand,
  UpdateTableViewsCommandReturnType
> {
  private readonly viewsSchemaHash: string;

  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    private readonly viewValidationService: ViewValidationService,
    private readonly jsonSchemaValidator: JsonSchemaValidatorService,
    private readonly systemTablesService: SystemTablesService,
    private readonly commandBus: CommandBus,
  ) {
    super(transactionService, draftContext);
    this.viewsSchemaHash =
      this.jsonSchemaValidator.getSchemaHash(tableViewsSchema);
  }

  protected async handler({
    data,
  }: UpdateTableViewsCommand): Promise<UpdateTableViewsCommandReturnType> {
    const { result, errors } = await this.jsonSchemaValidator.validate(
      data.viewsData,
      tableViewsSchema,
      this.viewsSchemaHash,
    );

    if (!result) {
      throw new BadRequestException('Invalid views data', {
        cause: errors,
      });
    }

    const viewIds = new Set(data.viewsData.views.map((v) => v.id));
    if (!viewIds.has(data.viewsData.defaultViewId)) {
      throw new BadRequestException(
        `Default view "${data.viewsData.defaultViewId}" does not exist in views list`,
      );
    }

    if (viewIds.size !== data.viewsData.views.length) {
      throw new BadRequestException('View IDs must be unique');
    }

    await this.draftTransactionalCommands.resolveDraftRevision(data.revisionId);

    await this.viewValidationService.validateViewsFields(
      data.revisionId,
      data.tableId,
      data.viewsData,
    );

    await this.saveTableViews(data.revisionId, data.tableId, data.viewsData);

    await this.updateRevision(data.revisionId);

    return true;
  }

  private async saveTableViews(
    revisionId: string,
    tableId: string,
    viewsData: UpdateTableViewsCommand['data']['viewsData'],
  ): Promise<void> {
    const viewsTable = await this.systemTablesService.ensureSystemTable(
      revisionId,
      SystemTables.Views,
    );

    const existingRow = await this.findViewsRow(viewsTable.versionId, tableId);

    if (existingRow) {
      await this.commandBus.execute(
        new InternalUpdateRowCommand({
          revisionId,
          tableId: SystemTables.Views,
          rowId: tableId,
          data: viewsData as unknown as Prisma.InputJsonValue,
          schemaHash: this.viewsSchemaHash,
        }),
      );
    } else {
      await this.commandBus.execute(
        new InternalCreateRowCommand({
          revisionId,
          tableId: SystemTables.Views,
          rowId: tableId,
          data: viewsData as unknown as Prisma.InputJsonValue,
          schemaHash: this.viewsSchemaHash,
        }),
      );
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

  private async updateRevision(revisionId: string) {
    return this.transaction.revision.updateMany({
      where: { id: revisionId, hasChanges: false },
      data: { hasChanges: true },
    });
  }
}
