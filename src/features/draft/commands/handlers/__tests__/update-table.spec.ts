import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Prisma, Row } from 'src/__generated__/client';
import {
  prepareProject,
  PrepareProjectReturnType,
} from 'src/__tests__/utils/prepareProject';
import { getArraySchema, getRefSchema } from '@revisium/schema-toolkit/mocks';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import { tableMigrationsSchema } from 'src/features/share/schema/table-migrations-schema';
import { InitMigration, UpdateMigration } from '@revisium/schema-toolkit/types';
import {
  JsonSchemaTypeName,
  JsonStringSchema,
} from '@revisium/schema-toolkit/types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createTestingModule,
  testSchema,
  testSchemaString,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { UpdateTableCommand } from 'src/features/draft/commands/impl/update-table.command';
import { UpdateTableHandlerReturnType } from 'src/features/draft/commands/types/update-table.handler.types';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { SystemTables } from 'src/features/share/system-tables.consts';
import objectHash from 'object-hash';

describe('UpdateTableHandler', () => {
  it('should throw an error if the revision does not exist', async () => {
    const { tableId } = await prepareProject(prismaService);

    jest
      .spyOn(draftTransactionalCommands, 'resolveDraftRevision')
      .mockRejectedValue(new Error('Revision not found'));

    const command = new UpdateTableCommand({
      revisionId: 'unreal',
      tableId,
      patches: [
        {
          op: 'replace',
          path: '/properties/ver',
          value: {
            type: JsonSchemaTypeName.String,
            default: '',
          },
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if patches length is less than 1', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new UpdateTableCommand({
      revisionId: draftRevisionId,
      tableId,
      patches: [],
    });

    await expect(runTransaction(command)).rejects.toThrow(BadRequestException);
    await expect(runTransaction(command)).rejects.toThrow(
      'Invalid length of patches',
    );
  });

  it('should throw an error if the patches are invalid', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    // the first "replace" patch is invalid
    let command = new UpdateTableCommand({
      revisionId: draftRevisionId,
      tableId,
      patches: [
        {
          op: 'replace',
          path: '/properties/ver',
          value: {
            type: JsonSchemaTypeName.String,
            default: '',
            unrealKey: 'test',
          } as JsonStringSchema,
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'patches is not valid',
    );

    // the second "add" element is invalid
    command = new UpdateTableCommand({
      revisionId: draftRevisionId,
      tableId,
      patches: [
        {
          op: 'replace',
          path: '/properties/ver',
          value: {
            type: JsonSchemaTypeName.String,
            default: '',
          },
        },
        {
          op: 'add',
          path: '/properties/addKey',
          value: {
            type: JsonSchemaTypeName.String,
            default: '',
            unrealKey: 'test',
          } as JsonStringSchema,
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'patches is not valid',
    );
  });

  it('should throw an error if findTableInRevisionOrThrow fails', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    jest
      .spyOn(draftTransactionalCommands, 'resolveDraftRevision')
      .mockRejectedValue(new Error('Table not found'));

    const command = new UpdateTableCommand({
      revisionId: draftRevisionId,
      tableId,
      patches: [
        {
          op: 'replace',
          path: '/properties/ver',
          value: {
            type: JsonSchemaTypeName.String,
            default: '',
          },
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow('Table not found');
  });

  it('should throw an error if itself foreign keys are found in checkItselfForeignKey', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new UpdateTableCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      patches: [
        {
          op: 'replace',
          path: '/properties/ver',
          value: {
            type: JsonSchemaTypeName.String,
            foreignKey: tableId,
            default: '',
          },
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Itself foreign key is not supported yet',
    );
  });

  it('should throw an error if the table is a system table', async () => {
    const { draftRevisionId } = await prepareProject(prismaService);

    const command = new UpdateTableCommand({
      revisionId: draftRevisionId,
      tableId: SystemTables.Schema,
      patches: [
        {
          op: 'replace',
          path: '/properties/ver',
          value: {
            type: JsonSchemaTypeName.String,
            default: '',
          },
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Table is a system table',
    );
  });

  it('should apply patches to the row in the table', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId, draftTableVersionId, row } = ids;

    const command = new UpdateTableCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      patches: [
        {
          op: 'replace',
          path: '/properties/ver',
          value: {
            type: JsonSchemaTypeName.String,
            default: '',
          },
        },
      ],
    });

    const result = await runTransaction(command);

    expect(result.tableVersionId).toBe(draftTableVersionId);
    expect(result.previousTableVersionId).toBe(draftTableVersionId);

    await rowAndTableCheck(ids, {}, row);
    await revisionCheck(ids);
    await migrationCheck({ revisionId: draftRevisionId, tableId });
  });

  it('should apply patches to a new created row in the table', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRowVersionId, draftRevisionId, tableId } = ids;
    const row = await prismaService.row.update({
      where: {
        versionId: draftRowVersionId,
      },
      data: {
        readonly: true,
      },
    });

    const command = new UpdateTableCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      patches: [
        {
          op: 'replace',
          path: '/properties/ver',
          value: {
            type: JsonSchemaTypeName.String,
            default: '',
          },
        },
      ],
    });

    await runTransaction(command);
    await rowAndTableCheck(
      ids,
      {
        skipCheckingRowVersionId: true,
        skipCheckingTableVersionId: true,
      },
      row,
    );
    await revisionCheck(ids);
  });

  it('should apply patches to the row in a new created table', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId, draftTableVersionId, row } = ids;
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: true,
      },
    });

    const command = new UpdateTableCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      patches: [
        {
          op: 'replace',
          path: '/properties/ver',
          value: {
            type: JsonSchemaTypeName.String,
            default: '',
          },
        },
      ],
    });

    await runTransaction(command);
    await rowAndTableCheck(
      ids,
      {
        skipCheckingTableVersionId: true,
      },
      row,
    );
    await revisionCheck(ids);
  });

  it('should save the schema correctly', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId } = ids;

    const command = new UpdateTableCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      patches: [
        {
          op: 'replace',
          path: '/properties/ver',
          value: {
            type: JsonSchemaTypeName.String,
            default: '',
          },
        },
      ],
    });

    await runTransaction(command);

    const schema = {
      type: JsonSchemaTypeName.Object,
      required: ['ver'],
      properties: {
        ver: {
          type: JsonSchemaTypeName.String,
          default: '',
        },
      },
      additionalProperties: false,
    };
    const meta = [
      {
        patches: [{ op: 'add', path: '', value: testSchema }],
        hash: objectHash(testSchema),
        date: expect.any(String),
      },
      {
        patches: [
          {
            op: 'replace',
            path: '/properties/ver',
            value: {
              type: JsonSchemaTypeName.String,
              default: '',
            },
          },
        ],
        hash: objectHash(schema),
        date: expect.any(String),
      },
    ];
    await schemaCheck(ids, schema, meta);
  });

  it('should save the schema correctly with ref', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId } = ids;

    const command = new UpdateTableCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      patches: [
        {
          op: 'add',
          path: '/properties/files',
          value: getArraySchema(getRefSchema(SystemSchemaIds.File)),
        },
      ],
    });

    await runTransaction(command);

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
    const meta = [
      {
        patches: [{ op: 'add', path: '', value: testSchema }],
        hash: objectHash(testSchema),
        date: expect.any(String),
      },
      {
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
        hash: objectHash(schema),
        date: expect.any(String),
      },
    ];
    await schemaCheck(ids, schema, meta);
  });

  async function revisionCheck(ids: PrepareProjectReturnType) {
    const { draftRevisionId } = ids;

    const revision = await prismaService.revision.findFirstOrThrow({
      where: { id: draftRevisionId },
    });
    expect(revision.hasChanges).toBe(true);
  }

  async function migrationCheck({
    revisionId,
    tableId,
  }: {
    revisionId: string;
    tableId: string;
  }) {
    const rows = await prismaService.row.findMany({
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
                id: revisionId,
              },
            },
          },
        },
      },
      orderBy: {
        id: Prisma.SortOrder.desc,
      },
    });

    expect(rows.length).toBe(2);

    const rowInit = rows[1];
    const dataInit = rowInit.data as InitMigration;
    expect(dataInit.changeType).toBe('init');

    const rowUpdate = rows[0];

    const schema = {
      type: 'object',
      additionalProperties: false,
      required: ['ver'],
      properties: {
        ver: {
          type: 'string',
          default: '',
        },
      },
    };

    const data = rowUpdate.data as UpdateMigration;
    expect(rowUpdate.id).toBe(data.id);
    expect(rowUpdate.meta).toStrictEqual({});
    expect(rowUpdate.hash).toBe(objectHash(data));
    expect(rowUpdate.schemaHash).toBe(objectHash(tableMigrationsSchema));
    expect(data.hash).toBe(objectHash(schema));
    expect(data.changeType).toBe('update');
    expect(data.tableId).toBe(tableId);
    expect(data.patches).toStrictEqual([
      {
        op: 'replace',
        path: '/properties/ver',
        value: {
          type: 'string',
          default: '',
        },
      },
    ]);
  }

  async function rowAndTableCheck(
    ids: PrepareProjectReturnType,
    {
      skipCheckingTableVersionId,
      skipCheckingRowVersionId,
    }: {
      skipCheckingTableVersionId?: boolean;
      skipCheckingRowVersionId?: boolean;
    } = {},
    previousRow: Row,
  ) {
    const row = await prismaService.row.findFirstOrThrow({
      where: {
        id: ids.rowId,
        tables: {
          some: {
            revisions: {
              some: {
                id: ids.draftRevisionId,
              },
            },
          },
        },
      },
    });

    expect(row.data).toStrictEqual({ ver: '2' });
    expect(row.hash).toStrictEqual(objectHash({ ver: '2' }));
    expect(row.schemaHash).toBe(objectHash(testSchemaString));
    expect(row.meta).toStrictEqual({});
    if (!skipCheckingRowVersionId) {
      expect(row.versionId).toBe(ids.draftRowVersionId);
    }
    expect(row.updatedAt.toISOString()).not.toBe(
      previousRow.updatedAt.toISOString(),
    );
    expect(row.createdAt.toISOString()).toBe(
      previousRow.createdAt.toISOString(),
    );

    const table = await prismaService.table.findFirstOrThrow({
      where: {
        id: ids.tableId,
        revisions: {
          some: {
            id: ids.draftRevisionId,
          },
        },
      },
    });
    expect(table.id).toBe(ids.tableId);
    expect(table.createdId).toBe(ids.tableCreatedId);
    if (!skipCheckingTableVersionId) {
      expect(table.versionId).toBe(ids.draftTableVersionId);
    }
  }

  async function schemaCheck(
    ids: PrepareProjectReturnType,
    schema: Prisma.InputJsonValue,
    meta: Prisma.InputJsonValue,
  ) {
    const { tableId, draftRevisionId } = ids;

    const schemaRow = await prismaService.row.findFirstOrThrow({
      where: {
        id: tableId,
        tables: {
          some: {
            id: SystemTables.Schema,
            revisions: {
              some: {
                id: draftRevisionId,
              },
            },
          },
        },
      },
    });

    expect(schemaRow.id).toBe(tableId);
    expect(schemaRow.data).toStrictEqual(schema);
    expect(schemaRow.hash).toStrictEqual(objectHash(schema));
    expect(schemaRow.schemaHash).toStrictEqual(objectHash(metaSchema));
    expect(schemaRow.meta).toStrictEqual(meta);
  }

  function runTransaction(
    command: UpdateTableCommand,
  ): Promise<UpdateTableHandlerReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;
  let draftTransactionalCommands: DraftTransactionalCommands;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
    draftTransactionalCommands = result.draftTransactionalCommands;
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
