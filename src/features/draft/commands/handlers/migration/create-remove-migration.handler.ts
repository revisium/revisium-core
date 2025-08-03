import { Logger } from '@nestjs/common';
import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import { BaseMigrationHandler } from 'src/features/draft/commands/handlers/migration/base-migration.handler';
import {
  CreateRemoveMigrationCommand,
  CreateRemoveMigrationCommandData,
} from 'src/features/draft/commands/impl/migration';
import { MigrationContextService } from 'src/features/draft/migration-context.service';
import { JsonSchemaValidatorService } from 'src/features/share/json-schema-validator.service';

import { RemoveMigration } from 'src/features/share/utils/schema/types/migration';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(CreateRemoveMigrationCommand)
export class CreateRemoveMigrationHandler extends BaseMigrationHandler<CreateRemoveMigrationCommand> {
  protected readonly logger = new Logger(CreateRemoveMigrationHandler.name);

  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly commandBus: CommandBus,
    protected readonly jsonSchemaValidator: JsonSchemaValidatorService,
    protected readonly migrationContextService: MigrationContextService,
  ) {
    super(transactionService, commandBus, jsonSchemaValidator);
  }

  protected async getMigration(
    data: CreateRemoveMigrationCommandData,
  ): Promise<RemoveMigration> {
    console.log({ data });

    return {
      changeType: 'remove',
      id: this.migrationContextService.migrationId ?? new Date().toISOString(),
      tableId: data.tableId,
    };
  }
}
