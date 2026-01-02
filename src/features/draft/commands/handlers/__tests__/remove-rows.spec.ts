import { CommandBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { RemoveRowsCommand } from 'src/features/draft/commands/impl/remove-rows.command';
import { RemoveRowsHandlerReturnType } from 'src/features/draft/commands/types/remove-rows.handler.types';
import { RowApiService } from 'src/features/row/row-api.service';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { JsonSchemaTypeName } from '@revisium/schema-toolkit/types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('RemoveRowsHandler', () => {
  it('should throw an error if the revision does not exist', async () => {
    const { tableId, rowId } = await prepareProject(prismaService);

    const command = new RemoveRowsCommand({
      revisionId: 'unreal',
      tableId,
      rowIds: [rowId],
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if row does not exist', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new RemoveRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rowIds: ['unreal'],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Rows not found in table: unreal',
    );
  });

  it('should throw an error if the table is a system table', async () => {
    const { draftRevisionId, rowId } = await prepareProject(prismaService);

    const command = new RemoveRowsCommand({
      revisionId: draftRevisionId,
      tableId: SystemTables.Schema,
      rowIds: [rowId],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Table is a system table',
    );
  });

  it('should throw an error if the foreignKey exists', async () => {
    const { draftRevisionId, schemaTableVersionId, tableId, rowId } =
      await prepareProject(prismaService);
    const anotherTableId = nanoid();
    const anotherTableVersionId = nanoid();
    const anotherRowId = nanoid();
    const anotherRowVersionId = nanoid();

    // table
    await prismaService.table.create({
      data: {
        id: anotherTableId,
        createdId: nanoid(),
        readonly: false,
        versionId: anotherTableVersionId,
        revisions: {
          connect: {
            id: draftRevisionId,
          },
        },
      },
    });
    // schema for table
    await prismaService.row.create({
      data: {
        id: anotherTableId,
        readonly: false,
        createdId: nanoid(),
        versionId: nanoid(),
        tables: {
          connect: {
            versionId: schemaTableVersionId,
          },
        },
        data: {
          type: JsonSchemaTypeName.Object,
          properties: {
            ref: {
              type: JsonSchemaTypeName.String,
              foreignKey: tableId,
              default: '',
            },
          },
          required: ['ref'],
        },
        hash: '',
        schemaHash: '',
      },
    });
    // row for another table
    await prismaService.row.create({
      data: {
        id: anotherRowId,
        readonly: false,
        createdId: nanoid(),
        versionId: anotherRowVersionId,
        tables: {
          connect: {
            versionId: anotherTableVersionId,
          },
        },
        data: {
          ref: rowId,
        },
        hash: '',
        schemaHash: '',
      },
    });

    const command = new RemoveRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rowIds: [rowId],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'The row is related to other rows',
    );
  });

  it('should remove the row if conditions are met', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const command = new RemoveRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rowIds: [rowId],
    });

    const result = await runTransaction(command);
    expect(result.tableVersionId).toBeTruthy();

    const row = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });
    expect(row).toBeNull();
  });

  it('should remove the row if conditions are met and if the table is a system table and skipCheckingNotSystemTable = true', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new RemoveRowsCommand({
      revisionId: draftRevisionId,
      tableId: SystemTables.Schema,
      avoidCheckingSystemTable: true,
      rowIds: [tableId],
    });

    const result = await runTransaction(command);

    expect(result).toBeTruthy();
  });

  // ==================== Multiple rows tests ====================

  it('should remove multiple rows successfully', async () => {
    const { draftRevisionId, tableId, draftTableVersionId, rowId } =
      await prepareProject(prismaService);

    const row2Id = nanoid();
    const row3Id = nanoid();
    await prismaService.row.create({
      data: {
        id: row2Id,
        versionId: nanoid(),
        createdId: nanoid(),
        readonly: false,
        data: {},
        hash: '',
        schemaHash: '',
        tables: {
          connect: { versionId: draftTableVersionId },
        },
      },
    });
    await prismaService.row.create({
      data: {
        id: row3Id,
        versionId: nanoid(),
        createdId: nanoid(),
        readonly: false,
        data: {},
        hash: '',
        schemaHash: '',
        tables: {
          connect: { versionId: draftTableVersionId },
        },
      },
    });

    const command = new RemoveRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rowIds: [rowId, row2Id, row3Id],
    });

    const result = await runTransaction(command);
    expect(result.tableVersionId).toBeTruthy();

    for (const id of [rowId, row2Id, row3Id]) {
      const row = await rowApiService.getRow({
        revisionId: draftRevisionId,
        tableId,
        rowId: id,
      });
      expect(row).toBeNull();
    }
  });

  it('should throw an error if one row exists but another does not', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const command = new RemoveRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rowIds: [rowId, 'non-existent-row'],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Rows not found in table: non-existent-row',
    );

    const row = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });
    expect(row).not.toBeNull();
  });

  it('should throw an error if one row has foreignKey dependency but another does not', async () => {
    const {
      draftRevisionId,
      schemaTableVersionId,
      tableId,
      rowId,
      draftTableVersionId,
    } = await prepareProject(prismaService);

    const row2Id = nanoid();
    await prismaService.row.create({
      data: {
        id: row2Id,
        versionId: nanoid(),
        createdId: nanoid(),
        readonly: false,
        data: {},
        hash: '',
        schemaHash: '',
        tables: {
          connect: { versionId: draftTableVersionId },
        },
      },
    });

    const anotherTableId = nanoid();
    const anotherTableVersionId = nanoid();
    await prismaService.table.create({
      data: {
        id: anotherTableId,
        createdId: nanoid(),
        readonly: false,
        versionId: anotherTableVersionId,
        revisions: { connect: { id: draftRevisionId } },
      },
    });
    await prismaService.row.create({
      data: {
        id: anotherTableId,
        readonly: false,
        createdId: nanoid(),
        versionId: nanoid(),
        tables: { connect: { versionId: schemaTableVersionId } },
        data: {
          type: JsonSchemaTypeName.Object,
          properties: {
            ref: {
              type: JsonSchemaTypeName.String,
              foreignKey: tableId,
              default: '',
            },
          },
          required: ['ref'],
        },
        hash: '',
        schemaHash: '',
      },
    });
    await prismaService.row.create({
      data: {
        id: nanoid(),
        readonly: false,
        createdId: nanoid(),
        versionId: nanoid(),
        tables: { connect: { versionId: anotherTableVersionId } },
        data: { ref: rowId },
        hash: '',
        schemaHash: '',
      },
    });

    const command = new RemoveRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rowIds: [row2Id, rowId],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'The row is related to other rows',
    );

    const row1 = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });
    const row2 = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId: row2Id,
    });
    expect(row1).not.toBeNull();
    expect(row2).not.toBeNull();
  });

  // ==================== Edge case tests ====================

  it('should throw an error if rowIds is empty', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new RemoveRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rowIds: [],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'rowIds array cannot be empty',
    );
  });

  it('should handle duplicate rowIds correctly', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const command = new RemoveRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rowIds: [rowId, rowId, rowId],
    });

    const result = await runTransaction(command);
    expect(result.tableVersionId).toBeTruthy();

    const row = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });
    expect(row).toBeNull();
  });

  it('should revert table correctly when table exists only in draft (not in head)', async () => {
    const { draftRevisionId } = await prepareProject(prismaService);

    const newTableId = nanoid();
    const newTableVersionId = nanoid();
    await prismaService.table.create({
      data: {
        id: newTableId,
        versionId: newTableVersionId,
        createdId: nanoid(),
        readonly: false,
        revisions: {
          connect: { id: draftRevisionId },
        },
      },
    });

    const rowId = nanoid();
    await prismaService.row.create({
      data: {
        id: rowId,
        versionId: nanoid(),
        createdId: nanoid(),
        readonly: false,
        data: {},
        hash: '',
        schemaHash: '',
        tables: {
          connect: { versionId: newTableVersionId },
        },
      },
    });

    const command = new RemoveRowsCommand({
      revisionId: draftRevisionId,
      tableId: newTableId,
      rowIds: [rowId],
      avoidCheckingSystemTable: true,
    });

    const result = await runTransaction(command);
    expect(result.tableVersionId).toBeTruthy();

    const row = await prismaService.row.findFirst({
      where: {
        id: rowId,
        tables: {
          some: {
            id: newTableId,
            revisions: { some: { id: draftRevisionId } },
          },
        },
      },
    });
    expect(row).toBeNull();

    const table = await prismaService.table.findFirst({
      where: {
        id: newTableId,
        revisions: { some: { id: draftRevisionId } },
      },
    });
    expect(table).toBeNull();
  });

  function runTransaction(
    command: RemoveRowsCommand,
  ): Promise<RemoveRowsHandlerReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;
  let rowApiService: RowApiService;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
    rowApiService = result.module.get<RowApiService>(RowApiService);
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
