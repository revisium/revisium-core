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
  CreateInitMigrationCommand,
  CreateInitMigrationCommandReturnType,
  CreateRenameMigrationCommand,
  CreateUpdateMigrationCommand,
} from 'src/features/draft/commands/impl/migration';
import { SystemSchemaIds } from 'src/features/share/schema-ids.consts';
import { SystemTables } from 'src/features/share/system-tables.consts';
import {
  InitMigration,
  RenameMigration,
  UpdateMigration,
} from 'src/features/share/utils/schema/types/migration';
import {
  JsonSchema,
  JsonSchemaTypeName,
} from 'src/features/share/utils/schema/types/schema.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('Migrations', () => {
  const newTableId = 'newTable';

  it('should throw an error if revision is not a draft revision', async () => {
    const { headRevisionId } = await prepareProject(prismaService);

    const command = new CreateInitMigrationCommand({
      revisionId: headRevisionId,
      tableId: newTableId,
      schema: testSchema,
    });

    await expect(runTransaction(command)).rejects.toThrow(BadRequestException);
    await expect(runTransaction(command)).rejects.toThrow(
      'Revision is not draft revision',
    );
  });

  it('should  not create a new migration if there is not migration table', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId } = ids;

    await prismaService.table.deleteMany({
      where: {
        id: SystemTables.Migration,
        revisions: {
          some: {
            id: draftRevisionId,
          },
        },
      },
    });

    const command = new CreateInitMigrationCommand({
      revisionId: draftRevisionId,
      tableId: newTableId,
      schema: testSchema,
    });

    const result = await runTransaction(command);
    expect(result).toBe(false);

    const migrationRow = await prismaService.row.findFirst({
      where: {
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
    });

    expect(migrationRow).toBeNull();
  });

  it('should create a new init migration', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId } = ids;

    const command = new CreateInitMigrationCommand({
      revisionId: draftRevisionId,
      tableId: newTableId,
      schema: testSchema,
    });

    const result = await runTransaction(command);
    expect(result).toBe(true);

    const migrationRow = await prismaService.row.findFirstOrThrow({
      where: {
        data: {
          path: ['tableId'],
          equals: newTableId,
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
    });

    expect(migrationRow.data as InitMigration).toStrictEqual({
      changeType: 'init',
      id: expect.any(String),
      hash: objectHash(testSchema),
      schema: testSchema,
      tableId: newTableId,
    });
  });

  it('should create a new update migration', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId } = ids;

    const schema = {
      type: JsonSchemaTypeName.Object,
      required: ['files', 'ver'],
      properties: {
        ver: {
          type: JsonSchemaTypeName.Number,
          default: 0,
        },
        files: {
          type: JsonSchemaTypeName.Array,
          items: {
            $ref: SystemSchemaIds.File,
          },
        },
      },
      additionalProperties: false,
    };

    const command = new CreateUpdateMigrationCommand({
      revisionId: draftRevisionId,
      tableId,
      patches: [
        {
          op: 'add',
          path: '/properties/files',
          value: {
            items: {
              $ref: SystemSchemaIds.File,
            },
            type: JsonSchemaTypeName.Array,
          },
        },
      ],
      schema: schema as JsonSchema,
    });

    const result = await runTransaction(command);
    expect(result).toBe(true);

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

    expect(migrationRow.data as UpdateMigration).toStrictEqual({
      changeType: 'update',
      id: expect.any(String),
      hash: objectHash(schema),
      patches: [
        {
          op: 'add',
          path: '/properties/files',
          value: {
            items: {
              $ref: SystemSchemaIds.File,
            },
            type: 'array',
          },
        },
      ],
      tableId,
    });
  });

  it('should create a new rename migration', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId } = ids;

    const nextTableId = 'nextTableId';

    const command = new CreateRenameMigrationCommand({
      revisionId: draftRevisionId,
      tableId,
      nextTableId,
    });

    const result = await runTransaction(command);
    expect(result).toBe(true);

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

    expect(migrationRow.data as RenameMigration).toStrictEqual({
      changeType: 'rename',
      id: expect.any(String),
      tableId,
      nextTableId,
    });
  });

  function runTransaction(
    command: ICommand,
  ): Promise<CreateInitMigrationCommandReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;

  beforeEach(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
  });

  afterEach(async () => {
    await prismaService.$disconnect();
  });
});
