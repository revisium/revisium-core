import { CommandBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import {prepareBranch} from "src/__tests__/utils/prepareBranch";
import {
  createTestingModule,

} from 'src/features/draft/commands/handlers/__tests__/utils';
import { RemoveRowCommand } from 'src/features/draft/commands/impl/remove-row.command';
import { RemoveRowHandlerReturnType } from 'src/features/draft/commands/types/remove-row.handler.types';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('RemoveRowHandler', () => {
  it('should throw an error if the revision does not exist', async () => {
    const { tableId, rowId } = await prepareBranch(prismaService);

    const command = new RemoveRowCommand({
      revisionId: 'unreal',
      tableId,
      rowId,
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if findRowInTableOrThrow fails', async () => {
    const { draftRevisionId, tableId } = await prepareBranch(prismaService);

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId: 'unreal',
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'A row with this name does not exist in the revision',
    );
  });

  it('should throw an error if the table is a system table', async () => {
    const { draftRevisionId, rowId } = await prepareBranch(prismaService);

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId: SystemTables.Schema,
      rowId,
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Table is a system table',
    );
  });

  it('should throw an error if the reference exists', async () => {
    const { draftRevisionId, schemaTableVersionId, tableId, rowId } =
      await prepareBranch(prismaService);
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
              reference: tableId,
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

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'The row is related to other rows',
    );
  });

  it('should remove the row if conditions are met', async () => {
    const { draftRevisionId, branchId, tableId, draftTableVersionId, rowId } =
      await prepareBranch(prismaService);

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
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
  });

  it('should remove the row if conditions are met and if the table is a system table and skipCheckingNotSystemTable = true', async () => {
    const { draftRevisionId, tableId } = await prepareBranch(prismaService);

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId: SystemTables.Schema,
      avoidCheckingSystemTable: true,
      rowId: tableId,
    });

    const result = await runTransaction(command);

    expect(result).toBeTruthy();
  });

  it('should remove the row in a new created table if conditions are met', async () => {
    const { draftRevisionId, tableId, rowId, draftTableVersionId } =
      await prepareBranch(prismaService);
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: true,
      },
    });

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).not.toBe(draftTableVersionId);
  });

  it('should update changelog if the row is in rowInserts #1', async () => {
    const { draftRevisionId, tableId, rowId, draftChangelogId } =
      await prepareBranch(prismaService);
    await prismaService.changelog.update({
      where: {
        id: draftChangelogId,
      },
      data: {
        rowInserts: {
          [tableId]: {
            rows: {
              anotherRow: '',
              [rowId]: '',
            },
          },
        },
        rowInsertsCount: 2,
      },
    });

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });

    await runTransaction(command);

    const changelog = await prismaService.changelog.findUniqueOrThrow({
      where: { id: draftChangelogId },
    });

    expect(changelog.rowInsertsCount).toBe(1);
    expect(changelog.rowInserts).toStrictEqual({
      [tableId]: {
        rows: { anotherRow: '' },
      },
    });
  });

  it('should update changelog if the row is in rowInserts #2', async () => {
    const { draftRevisionId, tableId, rowId, draftChangelogId } =
      await prepareBranch(prismaService);
    await prismaService.changelog.update({
      where: {
        id: draftChangelogId,
      },
      data: {
        rowInserts: {
          [tableId]: {
            rows: {
              [rowId]: '',
            },
          },
        },
        rowInsertsCount: 1,
        hasChanges: true,
      },
    });

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });

    await runTransaction(command);

    const changelog = await prismaService.changelog.findUniqueOrThrow({
      where: { id: draftChangelogId },
    });

    expect(changelog.rowInsertsCount).toBe(0);
    expect(changelog.rowInserts).toStrictEqual({});
    expect(changelog.hasChanges).toStrictEqual(false);
  });

  it('should update changelog if the row is not in rowInserts', async () => {
    const { draftRevisionId, tableId, rowId, draftChangelogId } =
      await prepareBranch(prismaService);
    await prismaService.changelog.update({
      where: {
        id: draftChangelogId,
      },
      data: {
        rowDeletes: {
          anotherTable: {},
        },
        rowDeletesCount: 0,
        hasChanges: false,
      },
    });

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });

    await runTransaction(command);

    const changelog = await prismaService.changelog.findUniqueOrThrow({
      where: { id: draftChangelogId },
    });

    expect(changelog.rowDeletesCount).toBe(1);
    expect(changelog.rowDeletes).toStrictEqual({
      anotherTable: {},
      [tableId]: {
        rows: {
          [rowId]: '',
        },
      },
    });
    expect(changelog.hasChanges).toBe(true);
  });

  it('should revert the table if there was last change in the table', async () => {
    const {
      draftRevisionId,
      tableId,
      rowId,
      draftChangelogId,
      draftTableVersionId,
      headTableVersionId,
    } = await prepareBranch(prismaService);
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: false,
      },
    });
    await prismaService.changelog.update({
      where: {
        id: draftChangelogId,
      },
      data: {
        tableUpdates: {
          anotherTable: '',
          [tableId]: '',
        },
        rowInserts: {
          [tableId]: {
            rows: {
              [rowId]: '',
            },
          },
        },
        tableUpdatesCount: 1,
        rowInsertsCount: 1,
        hasChanges: true,
      },
    });

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBeUndefined();
    expect(result.tableVersionId).toBeUndefined();

    // table
    const table = await prismaService.table.findFirstOrThrow({
      where: {
        id: tableId,
        revisions: {
          some: {
            id: draftRevisionId,
          },
        },
      },
    });
    expect(table.readonly).toBe(true);
    expect(table.versionId).toBe(headTableVersionId);

    // changelog
    const changelog = await prismaService.changelog.findUniqueOrThrow({
      where: { id: draftChangelogId },
    });
    expect(changelog.tableUpdatesCount).toBe(0);
    expect(changelog.tableUpdates).toStrictEqual({
      anotherTable: '',
    });
  });

  it('should not revert the table if the schema is changed', async () => {
    const {
      draftRevisionId,
      tableId,
      rowId,
      draftChangelogId,
      draftTableVersionId,
    } = await prepareBranch(prismaService);
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: false,
      },
    });
    await prismaService.changelog.update({
      where: {
        id: draftChangelogId,
      },
      data: {
        tableUpdates: {
          [tableId]: '',
        },
        rowInserts: {
          [tableId]: {
            rows: {
              [rowId]: '',
            },
          },
        },
        // changed schema
        rowUpdates: {
          [SystemTables.Schema]: {
            rows: {
              [tableId]: '',
            },
          },
        },
        tableUpdatesCount: 1,
        rowInsertsCount: 1,
        hasChanges: true,
      },
    });

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).toBe(draftTableVersionId);

    const table = await prismaService.table.findFirstOrThrow({
      where: {
        id: tableId,
        revisions: {
          some: {
            id: draftRevisionId,
          },
        },
      },
    });
    expect(table.readonly).toBe(false);
    expect(table.versionId).toBe(draftTableVersionId);
  });

  it('should not revert the table if there is rowUpdates change', async () => {
    const {
      draftRevisionId,
      tableId,
      rowId,
      draftChangelogId,
      draftTableVersionId,
    } = await prepareBranch(prismaService);
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: false,
      },
    });
    await prismaService.changelog.update({
      where: {
        id: draftChangelogId,
      },
      data: {
        rowUpdates: {
          [tableId]: {
            rows: {
              someRow: '',
            },
          },
        },
        tableUpdates: {
          anotherTable: '',
          [tableId]: '',
        },
        rowInserts: {
          [tableId]: {
            rows: {
              [rowId]: '',
            },
          },
        },
      },
    });

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).toBe(draftTableVersionId);
  });

  it('should not revert the table if there is rowDeletes change', async () => {
    const {
      draftRevisionId,
      tableId,
      rowId,
      draftChangelogId,
      draftTableVersionId,
    } = await prepareBranch(prismaService);
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: false,
      },
    });
    await prismaService.changelog.update({
      where: {
        id: draftChangelogId,
      },
      data: {
        rowDeletes: {
          [tableId]: {
            rows: {
              someRow: '',
            },
          },
        },
        tableUpdates: {
          anotherTable: '',
          [tableId]: '',
        },
        rowInserts: {
          [tableId]: {
            rows: {
              [rowId]: '',
            },
          },
        },
      },
    });

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).toBe(draftTableVersionId);
  });

  it('should not revert the table if there is rowInserts change', async () => {
    const {
      draftRevisionId,
      tableId,
      rowId,
      draftChangelogId,
      draftTableVersionId,
    } = await prepareBranch(prismaService);
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: false,
      },
    });
    await prismaService.changelog.update({
      where: {
        id: draftChangelogId,
      },
      data: {
        tableUpdates: {
          anotherTable: '',
          [tableId]: '',
        },
        rowInserts: {
          [tableId]: {
            rows: {
              [rowId]: '',
              anotherRow: '',
            },
          },
        },
      },
    });

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).toBe(draftTableVersionId);
  });

  function runTransaction(
    command: RemoveRowCommand,
  ): Promise<RemoveRowHandlerReturnType> {
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
