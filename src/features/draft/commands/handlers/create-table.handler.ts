import { BadRequestException } from '@nestjs/common';
import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import { CreateSchemaCommand } from 'src/features/draft/commands/impl/transactional/create-schema.command';
import { traverseStore } from '@revisium/schema-toolkit/lib';
import { JsonSchema, JsonSchemaTypeName } from '@revisium/schema-toolkit/types';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  CreateTableCommand,
  CreateTableCommandData,
} from 'src/features/draft/commands/impl/create-table.command';
import { CreateTableHandlerReturnType } from 'src/features/draft/commands/types/create-table.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { JsonSchemaValidatorService } from 'src/features/share/json-schema-validator.service';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { DraftRevisionApiService } from 'src/features/draft-revision/draft-revision-api.service';

@CommandHandler(CreateTableCommand)
export class CreateTableHandler extends DraftHandler<
  CreateTableCommand,
  CreateTableHandlerReturnType
> {
  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly revisionRequestDto: DraftRevisionRequestDto,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly commandBus: CommandBus,
    protected readonly jsonSchemaValidator: JsonSchemaValidatorService,
    protected readonly jsonSchemaStore: JsonSchemaStoreService,
    protected readonly draftRevisionApi: DraftRevisionApiService,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data,
  }: CreateTableCommand): Promise<CreateTableHandlerReturnType> {
    const { revisionId, tableId, schema } = data;

    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);

    if (this.checkItselfForeignKey(tableId, schema)) {
      throw new BadRequestException(
        'Self-referencing foreignKey is not supported',
      );
    }

    const result = await this.draftRevisionApi.createTable({
      revisionId,
      tableId,
    });

    await this.draftTransactionalCommands.validateSchema(schema);
    await this.saveSchema(data);

    return {
      branchId: this.revisionRequestDto.branchId,
      revisionId: this.revisionRequestDto.id,
      tableVersionId: result.tableVersionId,
    };
  }

  private async saveSchema({
    revisionId,
    tableId,
    schema,
  }: CreateTableCommand['data']) {
    await this.commandBus.execute(
      new CreateSchemaCommand({
        revisionId,
        tableId,
        data: schema as JsonSchema,
      }),
    );
    await this.jsonSchemaValidator.getOrAddValidateFunction(
      schema,
      this.jsonSchemaValidator.getSchemaHash(schema),
    );
  }

  private checkItselfForeignKey(
    tableId: string,
    schema: CreateTableCommandData['schema'],
  ): boolean {
    let isThereItselfForeignKey = false;

    try {
      const schemaStore = this.jsonSchemaStore.create(schema as JsonSchema);
      traverseStore(schemaStore, (item) => {
        if (
          item.type === JsonSchemaTypeName.String &&
          item.foreignKey === tableId
        ) {
          isThereItselfForeignKey = true;
        }
      });
    } catch {
      return false;
    }

    return isThereItselfForeignKey;
  }
}
