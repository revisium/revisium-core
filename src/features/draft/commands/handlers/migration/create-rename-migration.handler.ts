import { Logger } from '@nestjs/common';
import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import { BaseMigrationHandler } from 'src/features/draft/commands/handlers/migration/base-migration.handler';
import {
  CreateRenameMigrationCommand,
  CreateRenameMigrationCommandData,
} from 'src/features/draft/commands/impl/migration';
import { MigrationContextService } from 'src/features/draft/migration-context.service';
import { JsonSchemaValidatorService } from 'src/features/share/json-schema-validator.service';

import { RenameMigration } from 'src/features/share/utils/schema/types/migration';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(CreateRenameMigrationCommand)
export class CreateRenameMigrationHandler extends BaseMigrationHandler<CreateRenameMigrationCommand> {
  protected readonly logger = new Logger(CreateRenameMigrationHandler.name);

  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly commandBus: CommandBus,
    protected readonly jsonSchemaValidator: JsonSchemaValidatorService,
    protected readonly migrationContextService: MigrationContextService,
  ) {
    super(transactionService, commandBus, jsonSchemaValidator);
  }

  protected async getMigration(
    data: CreateRenameMigrationCommandData,
  ): Promise<RenameMigration> {
    return {
      changeType: 'rename',
      id: this.migrationContextService.migrationId ?? new Date().toISOString(),
      tableId: data.tableId,
      nextTableId: data.nextTableId,
    };
  }
}
