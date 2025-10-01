import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplyMigrationCommandReturnType,
  ApplyMigrationResult,
  ApplyMigrationsCommand,
} from 'src/features/draft/commands/impl/migration';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import { MigrationContextService } from 'src/features/draft/migration-context.service';
import { JsonSchemaValidatorService } from 'src/features/share/json-schema-validator.service';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { Migration } from '@revisium/schema-toolkit/types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@CommandHandler(ApplyMigrationsCommand)
export class ApplyMigrationsHandler
  implements
    ICommandHandler<ApplyMigrationsCommand, ApplyMigrationCommandReturnType>
{
  private readonly logger = new Logger(ApplyMigrationsHandler.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly jsonSchemaValidator: JsonSchemaValidatorService,
    protected readonly draftApiService: DraftApiService,
    protected readonly migrationContextService: MigrationContextService,
  ) {}

  async execute({ data }: ApplyMigrationsCommand) {
    await this.checkIsDraftRevision(data.revisionId);
    this.checkMigration(data.migrations);

    const response: ApplyMigrationResult[] = [];

    for (const migration of data.migrations) {
      const result: ApplyMigrationResult =
        await this.migrationContextService.run(migration.id, () =>
          this.applyMigration(data.revisionId, migration),
        );

      response.push(result);

      if (result.status === 'failed') {
        break;
      }
    }

    return response;
  }

  private checkMigration(migrations: Migration[]) {
    for (const migration of migrations) {
      const { result, errors } =
        this.jsonSchemaValidator.validateTableMigrationsSchema(migration);

      if (!result) {
        this.logger.error(errors);
        this.logger.error(migration);

        throw new BadRequestException('Invalid migration');
      }
    }
  }

  protected async checkIsDraftRevision(revisionId: string) {
    const revision = await this.prisma.revision.findUniqueOrThrow({
      where: {
        id: revisionId,
      },
    });

    if (!revision.isDraft) {
      throw new BadRequestException('Revision is not draft revision');
    }
  }

  private async applyMigration(
    revisionId: string,
    migration: Migration,
  ): Promise<ApplyMigrationResult> {
    if (await this.isThereMigration(revisionId, migration.id)) {
      return {
        id: migration.id,
        status: 'skipped',
      };
    }

    try {
      await this.checkId(revisionId, migration.id);
    } catch (error) {
      this.logger.error(error);

      return {
        id: migration.id,
        status: 'failed',
        error: (error as Error).message,
      };
    }

    try {
      if (migration.changeType === 'init') {
        await this.draftApiService.apiCreateTable({
          revisionId,
          tableId: migration.tableId,
          schema: migration.schema,
        });
      } else if (migration.changeType === 'update') {
        await this.draftApiService.apiUpdateTable({
          revisionId,
          tableId: migration.tableId,
          patches: migration.patches,
        });
      } else if (migration.changeType === 'rename') {
        await this.draftApiService.apiRenameTable({
          revisionId,
          tableId: migration.tableId,
          nextTableId: migration.nextTableId,
        });
      } else if (migration.changeType === 'remove') {
        await this.draftApiService.apiRemoveTable({
          revisionId,
          tableId: migration.tableId,
        });
      }

      return {
        id: migration.id,
        status: 'applied',
      };
    } catch (error) {
      this.logger.error(error);

      return {
        id: migration.id,
        status: 'failed',
        error: (error as Error).message,
      };
    }
  }

  public async isThereMigration(revisionId: string, migrationId: string) {
    const migration = await this.prisma.row.findFirst({
      where: {
        id: migrationId,
        tables: {
          some: {
            id: SystemTables.Migration,
            revisions: {
              some: {
                id: revisionId,
              },
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    return Boolean(migration);
  }

  private async checkId(revisionId: string, id: string) {
    const lastMigration = await this.prisma.row.findFirst({
      where: {
        publishedAt: {
          gte: id,
        },
        tables: {
          some: {
            id: SystemTables.Migration,
            revisions: {
              some: {
                id: revisionId,
              },
            },
          },
        },
      },
    });

    if (lastMigration) {
      throw new BadRequestException(
        `Provided id (${id}) must be after last migration date (${lastMigration.publishedAt.toISOString()}).`,
      );
    }
  }
}
