import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import { BaseMigrationHandler } from 'src/features/draft/commands/handlers/migration/base-migration.handler';
import {
  CreateInitMigrationCommand,
  CreateInitMigrationCommandData,
} from 'src/features/draft/commands/impl/migration';
import { JsonSchemaValidatorService } from 'src/features/share/json-schema-validator.service';

import { InitMigration } from 'src/features/share/utils/schema/types/migration';
import { HashService } from 'src/infrastructure/database/hash.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(CreateInitMigrationCommand)
export class CreateInitMigrationHandler extends BaseMigrationHandler<CreateInitMigrationCommand> {
  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly hashService: HashService,
    protected readonly commandBus: CommandBus,
    protected readonly jsonSchemaValidator: JsonSchemaValidatorService,
  ) {
    super(transactionService, commandBus, jsonSchemaValidator);
  }

  protected async getMigration(
    data: CreateInitMigrationCommandData,
  ): Promise<InitMigration> {
    return {
      changeType: 'init',
      tableId: data.tableId,
      date: new Date().toISOString(),
      hash: await this.hashService.hashObject(data.schema),
      schema: data.schema,
    };
  }
}
