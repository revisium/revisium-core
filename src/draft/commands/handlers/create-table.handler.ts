import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import { IdService } from 'src/database/id.service';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { CreateRowCommand } from 'src/draft/commands/impl/create-row.command';
import { CreateTableCommand } from 'src/draft/commands/impl/create-table.command';
import { CreateTableHandlerReturnType } from 'src/draft/commands/types/create-table.handler.types';
import { DraftContextService } from 'src/draft/draft-context.service';
import { DraftRevisionRequestDto } from 'src/draft/draft-request-dto/draft-revision-request.dto';
import { DraftTableRequestDto } from 'src/draft/draft-request-dto/table-request.dto';
import { DraftHandler } from 'src/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/draft/draft.transactional.commands';
import { JsonSchemaValidatorService } from 'src/draft/json-schema-validator.service';
import { SessionChangelogService } from 'src/draft/session-changelog.service';
import { SystemTables } from 'src/share/system-tables.consts';

@CommandHandler(CreateTableCommand)
export class CreateTableHandler extends DraftHandler<
  CreateTableCommand,
  CreateTableHandlerReturnType
> {
  constructor(
    protected readonly revisionRequestDto: DraftRevisionRequestDto,
    protected readonly draftContext: DraftContextService,
    protected readonly tableRequestDto: DraftTableRequestDto,
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly idService: IdService,
    protected readonly changelogSession: SessionChangelogService,
    protected readonly commandBus: CommandBus,
    protected readonly jsonSchemaValidator: JsonSchemaValidatorService,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data,
  }: CreateTableCommand): Promise<CreateTableHandlerReturnType> {
    const { revisionId, tableId, schema } = data;

    this.validateTableId(data.tableId);
    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);
    await this.checkTableExistence(revisionId, tableId);

    await this.createTable(tableId);
    await this.draftTransactionalCommands.validateSchema(schema);
    await this.saveSchema(data);

    return {
      branchId: this.revisionRequestDto.branchId,
      revisionId: this.revisionRequestDto.id,
      tableVersionId: this.tableRequestDto.versionId,
    };
  }

  private validateTableId(tableId: string) {
    if (tableId.length < 1) {
      throw new Error(
        'The length of the table name must be greater than or equal to 1',
      );
    }
  }

  private async checkTableExistence(revisionId: string, tableId: string) {
    const existingTable = await this.transaction.table.findFirst({
      where: { id: tableId, revisions: { some: { id: revisionId } } },
      select: { versionId: true },
    });

    if (existingTable) {
      throw new Error('A table with this name already exists in the revision');
    }
  }

  private async createTable(tableId: string) {
    this.tableRequestDto.id = tableId;
    this.tableRequestDto.versionId = this.idService.generate();

    await this.transaction.table.create({
      data: {
        versionId: this.tableRequestDto.versionId,
        id: this.tableRequestDto.id,
        readonly: false,
        revisions: {
          connect: {
            id: this.revisionRequestDto.id,
          },
        },
      },
      select: {
        versionId: true,
      },
    });

    await this.addTableToChangelog();
  }

  private async addTableToChangelog() {
    this.changelogSession.addTable('tableInserts');

    return this.transaction.changelog.update({
      where: { id: this.revisionRequestDto.changelogId },
      data: {
        tableInsertsCount: {
          increment: 1,
        },
        hasChanges: true,
      },
    });
  }

  private async saveSchema({
    revisionId,
    tableId,
    schema,
  }: CreateTableCommand['data']) {
    await this.commandBus.execute(
      new CreateRowCommand({
        revisionId,
        tableId: SystemTables.Schema,
        rowId: tableId,
        data: schema,
        skipCheckingNotSystemTable: true,
      }),
    );
    await this.jsonSchemaValidator.getOrAddValidateFunction(
      schema,
      this.jsonSchemaValidator.getSchemaHash(schema),
    );
  }
}
