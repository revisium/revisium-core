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
import { JsonSchemaValidatorService } from 'src/features/draft/json-schema-validator.service';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';

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
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data: input,
  }: CreateSchemaCommand): Promise<CreateSchemaCommandReturnType> {
    const { data } = input;

    await this.validateSchema(data);
    await this.createRowInSchemaTable(input);

    return true;
  }

  private async validateSchema(data: Prisma.InputJsonValue) {
    const schemaHash = this.jsonSchemaValidator.getSchemaHash(metaSchema);

    const { result, errors } = await this.jsonSchemaValidator.validate(
      data,
      metaSchema,
      schemaHash,
    );

    if (!result) {
      throw new BadRequestException('data is not valid', {
        cause: errors,
      });
    }
  }

  private createRowInSchemaTable(data: CreateSchemaCommand['data']) {
    return this.commandBus.execute<
      InternalCreateRowCommand,
      InternalCreateRowCommandReturnType
    >(
      new InternalCreateRowCommand({
        revisionId: data.revisionId,
        tableId: SystemTables.Schema,
        rowId: data.tableId,
        data: data.data,
      }),
    );
  }
}
