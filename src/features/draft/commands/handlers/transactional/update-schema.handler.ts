import { BadRequestException } from '@nestjs/common';
import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import {
  InternalUpdateRowCommand,
  InternalUpdateRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-update-row.command';
import {
  UpdateSchemaCommand,
  UpdateSchemaCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/update-schema.command';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { JsonSchemaValidatorService } from 'src/features/draft/json-schema-validator.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { HashService } from 'src/infrastructure/database/hash.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(UpdateSchemaCommand)
export class UpdateSchemaHandler extends DraftHandler<
  UpdateSchemaCommand,
  UpdateSchemaCommandReturnType
> {
  constructor(
    protected readonly commandBus: CommandBus,
    protected readonly transactionService: TransactionPrismaService,
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
    protected readonly draftContext: DraftContextService,
    protected readonly hashService: HashService,
    protected readonly jsonSchemaValidator: JsonSchemaValidatorService,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data: input,
  }: UpdateSchemaCommand): Promise<UpdateSchemaCommandReturnType> {
    const { schema, patches } = input;

    await this.validateSchema(schema);

    const { historyPatches } = await this.getCurrentHistoryPatches(input);
    this.validateHistoryPatches(historyPatches);

    const nextHistoryPatches = [
      ...historyPatches,
      {
        patches,
        hash: await this.hashService.hashObject(schema),
      },
    ];
    this.validateHistoryPatches(nextHistoryPatches);

    await this.updateRowInSchemaTable(input, nextHistoryPatches);

    return true;
  }

  private getCurrentHistoryPatches(data: UpdateSchemaCommand['data']) {
    return this.shareTransactionalQueries.getTableSchema(
      data.revisionId,
      data.tableId,
    );
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

  private validateHistoryPatches(data: Prisma.InputJsonValue) {
    const { result, errors } =
      this.jsonSchemaValidator.validateHistoryPatchesSchema(data);

    if (!result) {
      throw new BadRequestException('patches is not valid', {
        cause: errors,
      });
    }
  }

  private updateRowInSchemaTable(
    data: UpdateSchemaCommand['data'],
    meta: Prisma.InputJsonValue,
  ) {
    return this.commandBus.execute<
      InternalUpdateRowCommand,
      InternalUpdateRowCommandReturnType
    >(
      new InternalUpdateRowCommand({
        revisionId: data.revisionId,
        tableId: SystemTables.Schema,
        rowId: data.tableId,
        data: data.schema,
        meta,
        schemaHash: this.jsonSchemaValidator.metaSchemaHash,
      }),
    );
  }
}
