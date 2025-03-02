import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  prepareBranch,
  PrepareBranchReturnType,
} from 'src/__tests__/utils/prepareBranch';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import {
  JsonSchemaTypeName,
  JsonStringSchema,
} from 'src/features/share/utils/schema/types/schema.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createMock,
  createTestingModule,
  testSchema,
  testSchemaString,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { UpdateTableCommand } from 'src/features/draft/commands/impl/update-table.command';
import { UpdateTableHandlerReturnType } from 'src/features/draft/commands/types/update-table.handler.types';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { SystemTables } from 'src/features/share/system-tables.consts';
import * as objectHash from 'object-hash';

describe('UpdateTableHandler', () => {
  it('should throw an error if the revision does not exist', async () => {
    const { tableId } = await prepareBranch(prismaService);

    draftTransactionalCommands.resolveDraftRevision = createMock(
      new Error('Revision not found'),
    );

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
    const { draftRevisionId, tableId } = await prepareBranch(prismaService);

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
    const { draftRevisionId, tableId } = await prepareBranch(prismaService);

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
    const { draftRevisionId, tableId } = await prepareBranch(prismaService);

    draftTransactionalCommands.resolveDraftRevision = createMock(
      new Error('Table not found'),
    );

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

  it('should throw an error if itself references are found in checkItselfReference', async () => {
    const { draftRevisionId, tableId } = await prepareBranch(prismaService);

    const command = new UpdateTableCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      patches: [
        {
          op: 'replace',
          path: '/properties/ver',
          value: {
            type: JsonSchemaTypeName.String,
            reference: tableId,
            default: '',
          },
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Itself references is not supported yet',
    );
  });

  it('should throw an error if the table is a system table', async () => {
    const { draftRevisionId } = await prepareBranch(prismaService);

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
    const ids = await prepareBranch(prismaService);
    const { draftRevisionId, tableId, draftTableVersionId } = ids;

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

    await rowAndTableCheck(ids);
  });

  it('should apply patches to a new created row in the table', async () => {
    const ids = await prepareBranch(prismaService);
    const { draftRowVersionId, draftRevisionId, tableId } = ids;
    await prismaService.row.update({
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
    await rowAndTableCheck(ids, {
      skipCheckingRowVersionId: true,
      skipCheckingTableVersionId: true,
    });
  });

  it('should apply patches to the row in a new created table', async () => {
    const ids = await prepareBranch(prismaService);
    const { draftRevisionId, tableId, draftTableVersionId } = ids;
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
    await rowAndTableCheck(ids, {
      skipCheckingTableVersionId: true,
    });
  });

  it('should save the schema correctly', async () => {
    const ids = await prepareBranch(prismaService);
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

    await schemaCheck(ids);
  });

  async function rowAndTableCheck(
    ids: PrepareBranchReturnType,
    {
      skipCheckingTableVersionId,
      skipCheckingRowVersionId,
    }: {
      skipCheckingTableVersionId?: boolean;
      skipCheckingRowVersionId?: boolean;
    } = {},
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

  async function schemaCheck(ids: PrepareBranchReturnType) {
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
    expect(schemaRow.id).toBe(tableId);
    expect(schemaRow.data).toStrictEqual(schema);
    expect(schemaRow.hash).toStrictEqual(objectHash(schema));
    expect(schemaRow.schemaHash).toStrictEqual(objectHash(metaSchema));
    expect(schemaRow.meta).toStrictEqual([
      {
        patches: [{ op: 'add', path: '', value: testSchema }],
        hash: objectHash(testSchema),
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
      },
    ]);
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

  beforeEach(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
    draftTransactionalCommands = result.draftTransactionalCommands;
  });

  afterEach(async () => {
    await prismaService.$disconnect();
  });
});
