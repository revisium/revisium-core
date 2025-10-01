import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  InternalCreateRowCommand,
  InternalCreateRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-create-row.command';
import { JsonSchemaValidatorService } from 'src/features/share/json-schema-validator.service';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { Migration } from '@revisium/schema-toolkit/types';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

export abstract class BaseMigrationHandler<
  T extends { data: { revisionId: string } },
> {
  protected constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly commandBus: CommandBus,
    protected readonly jsonSchemaValidator: JsonSchemaValidatorService,
  ) {}

  protected abstract readonly logger: Logger;

  protected get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute(command: T): Promise<boolean> {
    await this.checkIsDraftRevision(command.data.revisionId);

    if (await this.checkTableExisting(command)) {
      const migration = await this.getMigration(command.data);

      const { result, errors } =
        this.jsonSchemaValidator.validateTableMigrationsSchema(migration);

      if (!result) {
        this.logger.error(migration);

        throw new InternalServerErrorException(errors);
      }

      await this.createRowInMigrationTable(command.data.revisionId, migration);
      return true;
    } else {
      this.logger.error(
        `No table ${SystemTables.Migration} found in draft revision ${command.data.revisionId}`,
      );

      return false;
    }
  }

  protected abstract getMigration(data: {
    revisionId: string;
  }): Promise<Migration>;

  protected async checkTableExisting(command: T): Promise<boolean> {
    const table = await this.transaction.table.findFirst({
      where: {
        revisions: {
          some: {
            id: command.data.revisionId,
          },
        },
        id: SystemTables.Migration,
      },
      select: {
        createdId: true,
      },
    });

    return Boolean(table);
  }

  protected async checkIsDraftRevision(revisionId: string) {
    const revision = await this.transaction.revision.findUniqueOrThrow({
      where: {
        id: revisionId,
      },
    });

    if (!revision.isDraft) {
      throw new BadRequestException('Revision is not draft revision');
    }
  }

  protected createRowInMigrationTable(
    revisionId: string,
    migration: Migration,
  ) {
    return this.commandBus.execute<
      InternalCreateRowCommand,
      InternalCreateRowCommandReturnType
    >(
      new InternalCreateRowCommand({
        revisionId,
        tableId: SystemTables.Migration,
        rowId: migration.id,
        data: migration,
        schemaHash: this.jsonSchemaValidator.tableSchemaHash,
        publishedAt: migration.id,
      }),
    );
  }
}
