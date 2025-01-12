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
import { metaSchema } from 'src/features/share/schema/meta-schema';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(UpdateSchemaCommand)
export class UpdateSchemaHandler extends DraftHandler<
  UpdateSchemaCommand,
  UpdateSchemaCommandReturnType
> {
  constructor(
    protected readonly commandBus: CommandBus,
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly jsonSchemaValidator: JsonSchemaValidatorService,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data: input,
  }: UpdateSchemaCommand): Promise<UpdateSchemaCommandReturnType> {
    const { data } = input;

    await this.validateSchema(data);
    await this.updateRowInSchemaTable(input);

    return true;
  }

  private async validateSchema(data: Prisma.InputJsonValue) {
    const { result, errors } = await this.jsonSchemaValidator.validate(
      data,
      metaSchema,
      this.jsonSchemaValidator.metaSchemaHash,
    );

    if (!result) {
      throw new BadRequestException('data is not valid', {
        cause: errors,
      });
    }
  }

  private updateRowInSchemaTable(data: UpdateSchemaCommand['data']) {
    return this.commandBus.execute<
      InternalUpdateRowCommand,
      InternalUpdateRowCommandReturnType
    >(
      new InternalUpdateRowCommand({
        revisionId: data.revisionId,
        tableId: SystemTables.Schema,
        rowId: data.tableId,
        data: data.data,
        schemaHash: this.jsonSchemaValidator.metaSchemaHash,
      }),
    );
  }
}
