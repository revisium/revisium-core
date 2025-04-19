import { BadRequestException } from '@nestjs/common';
import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import {
  CreateSchemaCommand,
  CreateSchemaCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/create-schema.command';
import {
  InternalCreateRowCommand,
  InternalCreateRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-create-row.command';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { JsonSchemaValidatorService } from 'src/features/draft/json-schema-validator.service';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';
import { VALIDATE_JSON_FIELD_NAME_ERROR_MESSAGE } from 'src/features/share/utils/validateUrlLikeId/validateJsonFieldName';
import { HashService } from 'src/infrastructure/database/hash.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(CreateSchemaCommand)
export class CreateSchemaHandler extends DraftHandler<
  CreateSchemaCommand,
  CreateSchemaCommandReturnType
> {
  constructor(
    protected readonly commandBus: CommandBus,
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly jsonSchemaValidator: JsonSchemaValidatorService,
    protected readonly hashService: HashService,
    protected readonly jsonSchemaStore: JsonSchemaStoreService,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data: input,
  }: CreateSchemaCommand): Promise<CreateSchemaCommandReturnType> {
    const { data } = input;

    await this.validateSchema(data);

    const invalidFields = this.jsonSchemaStore.getInvalidFieldNamesInSchema(
      data as JsonSchema,
    );
    if (invalidFields.length > 0) {
      throw new BadRequestException(
        `Invalid field names: ${invalidFields.map((item) => item.name).join(', ')}. ${VALIDATE_JSON_FIELD_NAME_ERROR_MESSAGE}`,
      );
    }

    const historyPatches = await this.getHistoryPatchesByData(data);

    await this.createRowInSchemaTable(input, historyPatches);

    return true;
  }

  private async validateSchema(data: Prisma.InputJsonValue) {
    const { result, errors } =
      this.jsonSchemaValidator.validateMetaSchema(data);

    if (!result) {
      throw new BadRequestException('data is not valid', {
        cause: errors,
      });
    }
  }

  private async getHistoryPatchesByData(data: Prisma.InputJsonValue) {
    return [
      {
        patches: [
          {
            op: 'add',
            path: '',
            value: data as JsonSchema,
          },
        ],
        hash: await this.hashService.hashObject(data),
      },
    ] as Prisma.InputJsonValue;
  }

  private createRowInSchemaTable(
    data: CreateSchemaCommand['data'],
    historyPatches: Prisma.InputJsonValue,
  ) {
    return this.commandBus.execute<
      InternalCreateRowCommand,
      InternalCreateRowCommandReturnType
    >(
      new InternalCreateRowCommand({
        revisionId: data.revisionId,
        tableId: SystemTables.Schema,
        rowId: data.tableId,
        data: data.data,
        meta: historyPatches,
        schemaHash: this.jsonSchemaValidator.metaSchemaHash,
      }),
    );
  }
}
