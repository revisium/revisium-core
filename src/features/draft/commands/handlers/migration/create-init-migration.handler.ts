import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BaseMigrationHandler } from 'src/features/draft/commands/handlers/migration/base-migration.handler';
import {
  CreateInitMigrationCommand,
  CreateInitMigrationCommandData,
  CreateInitMigrationCommandReturnType,
} from 'src/features/draft/commands/impl/migration';
import {
  InternalCreateRowCommand,
  InternalCreateRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-create-row.command';
import { JsonSchemaValidatorService } from 'src/features/share/json-schema-validator.service';
import { SystemTables } from 'src/features/share/system-tables.consts';

import { InitMigration } from 'src/features/share/utils/schema/types/migration';
import { HashService } from 'src/infrastructure/database/hash.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(CreateInitMigrationCommand)
export class CreateInitMigrationHandler
  extends BaseMigrationHandler<CreateInitMigrationCommand>
  implements
    ICommandHandler<
      CreateInitMigrationCommand,
      CreateInitMigrationCommandReturnType
    >
{
  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly hashService: HashService,
    protected readonly commandBus: CommandBus,
    protected readonly jsonSchemaValidator: JsonSchemaValidatorService,
  ) {
    super(transactionService);
  }

  async handler({ data }: CreateInitMigrationCommand) {
    const migration = await this.getMigration(data);
    await this.createRowInMigrationTable(data, migration);

    return true;
  }

  private async getMigration(
    data: CreateInitMigrationCommandData,
  ): Promise<InitMigration> {
    return {
      changeType: 'init',
      createdId: data.createdId,
      tableId: data.tableId,
      date: new Date().toISOString(),
      hash: await this.hashService.hashObject(data.schema),
      schema: data.schema,
    };
  }

  private createRowInMigrationTable(
    data: CreateInitMigrationCommandData,
    migration: InitMigration,
  ) {
    return this.commandBus.execute<
      InternalCreateRowCommand,
      InternalCreateRowCommandReturnType
    >(
      new InternalCreateRowCommand({
        revisionId: data.revisionId,
        tableId: SystemTables.Migration,
        rowId: migration.date,
        data: migration.schema,
        schemaHash: this.jsonSchemaValidator.metaSchemaHash,
      }),
    );
  }
}
