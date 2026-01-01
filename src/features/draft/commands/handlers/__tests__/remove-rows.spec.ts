import { CommandBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import {
  prepareProject,
  PrepareProjectReturnType,
} from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { RemoveRowsCommand } from 'src/features/draft/commands/impl/remove-rows.command';
import { RemoveRowsHandlerReturnType } from 'src/features/draft/commands/types/remove-rows.handler.types';
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
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, branchId, tableId, draftTableVersionId, rowId } =
      ids;

    const command = new RemoveRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rowIds: [rowId],
    });

    const result = await runTransaction(command);

    expect(result.branchId).toBe(branchId);
    expect(result.tableVersionId).toBe(draftTableVersionId);
    expect(result.previousTableVersionId).toBe(draftTableVersionId);

    const row = await prismaService.row.findFirst({
      where: {
        id: rowId,
        tables: {
          some: {
            id: tableId,
            revisions: {
              some: {
                id: draftRevisionId,
              },
            },
          },
        },
      },
    });
    expect(row).toBeNull();

    await checkRevision(ids, true);
  });

  it('should set hasChanges as false if conditions are met', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId, rowId, headRowVersionId } = ids;
    await prismaService.row.delete({
      where: {
        versionId: headRowVersionId,
      },
    });

    const command = new RemoveRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rowIds: [rowId],
    });

    await runTransaction(command);
    await checkRevision(ids, false);
  });

  it('should not set hasChanges as false if there is another row', async () => {
    const ids = await prepareProject(prismaService);
    const {
      draftRevisionId,
      tableId,
      rowId,
      headRowVersionId,
      draftTableVersionId,
    } = ids;
    await prismaService.row.delete({
      where: {
        versionId: headRowVersionId,
      },
    });
    await prismaService.row.create({
      data: {
        id: nanoid(),
        versionId: nanoid(),
        createdId: nanoid(),
        readonly: false,
        data: {},
        hash: '',
        schemaHash: '',
        tables: {
          connect: {
            versionId: draftTableVersionId,
          },
        },
      },
    });

    const command = new RemoveRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rowIds: [rowId],
    });

    await runTransaction(command);
    await checkRevision(ids, true);
  });

  it('should set hasChanges as true if remove readonly row', async () => {
    const ids = await prepareProject(prismaService);
    const {
      draftRevisionId,
      tableId,
      rowId,
      headRowVersionId,
      draftRowVersionId,
      draftTableVersionId,
    } = ids;
    await prismaService.revision.update({
      where: {
        id: draftRevisionId,
      },
      data: {
        hasChanges: false,
      },
    });
    await prismaService.row.delete({
      where: {
        versionId: draftRowVersionId,
      },
    });
    await prismaService.row.update({
      where: {
        versionId: headRowVersionId,
      },
      data: {
        tables: {
          connect: {
            versionId: draftTableVersionId,
          },
        },
      },
    });

    const command = new RemoveRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rowIds: [rowId],
    });

    await runTransaction(command);
    await checkRevision(ids, true);
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

  it('should remove the row in a new created table if conditions are met', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId, rowId, draftTableVersionId } = ids;
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: true,
      },
    });

    const command = new RemoveRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rowIds: [rowId],
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).not.toBe(draftTableVersionId);

    await checkRevision(ids, true);
  });

  // ==================== Multiple rows tests ====================

  it('should remove multiple rows successfully', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId, draftTableVersionId, rowId } = ids;

    // Create additional rows
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

    expect(result.branchId).toBeTruthy();
    expect(result.tableVersionId).toBe(draftTableVersionId);

    // Verify all rows are removed
    for (const id of [rowId, row2Id, row3Id]) {
      const row = await prismaService.row.findFirst({
        where: {
          id,
          tables: {
            some: {
              id: tableId,
              revisions: { some: { id: draftRevisionId } },
            },
          },
        },
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

    // Verify the existing row was not removed (transaction should rollback)
    const row = await prismaService.row.findFirst({
      where: {
        id: rowId,
        tables: {
          some: {
            id: tableId,
            revisions: { some: { id: draftRevisionId } },
          },
        },
      },
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

    // Create a second row without foreign key dependency
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

    // Create another table with foreign key reference to rowId (not row2Id)
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
    // schema for another table
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
    // row referencing rowId
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

    // Try to remove both rows - should fail because rowId has foreign key reference
    const command = new RemoveRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rowIds: [row2Id, rowId], // row2Id is fine, rowId has FK dependency
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'The row is related to other rows',
    );

    // Verify neither row was removed (transaction should rollback)
    const row1 = await prismaService.row.findFirst({
      where: {
        id: rowId,
        tables: {
          some: { id: tableId, revisions: { some: { id: draftRevisionId } } },
        },
      },
    });
    const row2 = await prismaService.row.findFirst({
      where: {
        id: row2Id,
        tables: {
          some: { id: tableId, revisions: { some: { id: draftRevisionId } } },
        },
      },
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
    const { draftRevisionId, branchId, tableId, draftTableVersionId, rowId } =
      await prepareProject(prismaService);

    const command = new RemoveRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rowIds: [rowId, rowId, rowId],
    });

    const result = await runTransaction(command);

    expect(result.branchId).toBe(branchId);
    expect(result.tableVersionId).toBe(draftTableVersionId);

    // Verify row was removed
    const row = await prismaService.row.findFirst({
      where: {
        id: rowId,
        tables: {
          some: {
            id: tableId,
            revisions: { some: { id: draftRevisionId } },
          },
        },
      },
    });
    expect(row).toBeNull();
  });

  it('should revert table correctly when table exists only in draft (not in head)', async () => {
    const { draftRevisionId, branchId } = await prepareProject(prismaService);

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
    const rowVersionId = nanoid();
    await prismaService.row.create({
      data: {
        id: rowId,
        versionId: rowVersionId,
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
    expect(result.branchId).toBe(branchId);

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

  async function checkRevision(
    ids: PrepareProjectReturnType,
    hasChanges: boolean,
  ) {
    const { draftRevisionId } = ids;

    const revision = await prismaService.revision.findFirstOrThrow({
      where: { id: draftRevisionId },
    });
    expect(revision.hasChanges).toBe(hasChanges);
  }

  function runTransaction(
    command: RemoveRowsCommand,
  ): Promise<RemoveRowsHandlerReturnType> {
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

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
