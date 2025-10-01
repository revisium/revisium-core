import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ICommand } from '@nestjs/cqrs/dist/interfaces/commands/command.interface';
import { Prisma } from '@prisma/client';
import * as objectHash from 'object-hash';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import {
  createTestingModule,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import {
  ApplyMigrationCommandReturnType,
  ApplyMigrationsCommand,
} from 'src/features/draft/commands/impl/migration';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { RemoveMigration } from '@revisium/schema-toolkit/types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('ApplyMigration', () => {
  it('should throw an error if revision is not a draft revision', async () => {
    const { headRevisionId } = await prepareProject(prismaService);

    const command = new ApplyMigrationsCommand({
      revisionId: headRevisionId,
      migrations: [],
    });

    await expect(runTransaction(command)).rejects.toThrow(BadRequestException);
    await expect(runTransaction(command)).rejects.toThrow(
      'Revision is not draft revision',
    );
  });

  it('should throw an error if migration is invalid', async () => {
    const { draftRevisionId } = await prepareProject(prismaService);

    const command = new ApplyMigrationsCommand({
      revisionId: draftRevisionId,
      migrations: [
        {
          changeType: 'remove',
        } as RemoveMigration,
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow(BadRequestException);
    await expect(runTransaction(command)).rejects.toThrow('Invalid migration');
  });

  it('should throw an error if id (date) is less than previous', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const removeMigrationId = '1970-01-01T00:00:00Z';

    const command = new ApplyMigrationsCommand({
      revisionId: draftRevisionId,
      migrations: [
        {
          changeType: 'remove',
          tableId,
          id: removeMigrationId,
        },
      ],
    });

    const result = await runTransaction(command);

    expect(result).toStrictEqual([
      {
        error: `Provided id (${removeMigrationId}) must be after last migration date (2025-01-01T00:00:00.000Z).`,
        id: removeMigrationId,
        status: 'failed',
      },
    ]);
  });

  it('should apply migrations', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const migrationRow = await prismaService.row.findFirstOrThrow({
      where: {
        data: {
          path: ['tableId'],
          equals: tableId,
        },
        tables: {
          some: {
            id: SystemTables.Migration,
            revisions: {
              some: {
                id: draftRevisionId,
              },
            },
          },
        },
      },
      orderBy: {
        id: Prisma.SortOrder.desc,
      },
    });

    const renameMigrationId1 = '2025-01-02T00:00:00Z';
    const renameMigrationId2 = '2025-01-03T00:00:00Z';
    const updateMigrationId = '2025-01-04T10:00:00Z';
    const removeMigrationId = '2025-01-05T00:00:00Z';
    const failedMigrationId = '2025-01-06T00:00:00Z';

    const command = new ApplyMigrationsCommand({
      revisionId: draftRevisionId,
      migrations: [
        {
          changeType: 'init',
          id: migrationRow.id,
          tableId,
          hash: objectHash(testSchema),
          schema: testSchema,
        },
        {
          changeType: 'rename',
          id: renameMigrationId1,
          tableId,
          nextTableId: 'nextTableId',
        },
        {
          changeType: 'rename',
          id: renameMigrationId2,
          tableId: 'nextTableId',
          nextTableId: tableId,
        },
        {
          changeType: 'update',
          id: updateMigrationId,
          tableId,
          patches: [
            {
              op: 'add',
              path: '.',
              value: testSchema,
            },
          ],
          hash: '',
        },
        {
          changeType: 'remove',
          id: removeMigrationId,
          tableId,
        },
        {
          changeType: 'remove',
          id: failedMigrationId,
          tableId: 'unrealTableId',
        },
      ],
    });

    const result = await runTransaction(command);

    expect(result).toStrictEqual([
      {
        id: migrationRow.id,
        status: 'skipped',
      },
      {
        id: renameMigrationId1,
        status: 'applied',
      },
      {
        id: renameMigrationId2,
        status: 'applied',
      },
      {
        id: updateMigrationId,
        status: 'applied',
      },
      {
        id: removeMigrationId,
        status: 'applied',
      },
      {
        error: 'A table with this name does not exist in the revision',
        id: failedMigrationId,
        status: 'failed',
      },
    ]);
  });

  function runTransaction(
    command: ICommand,
  ): Promise<ApplyMigrationCommandReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
