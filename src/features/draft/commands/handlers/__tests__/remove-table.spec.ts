import { CommandBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import {prepareBranch} from "src/__tests__/utils/prepareBranch";
import {
  createTestingModule,

} from 'src/features/draft/commands/handlers/__tests__/utils';
import { RemoveTableCommand } from 'src/features/draft/commands/impl/remove-table.command';
import { RemoveTableHandlerReturnType } from 'src/features/draft/commands/types/remove-table.handler.types';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('RemoveTableHandler', () => {
  it('should throw an error if the revision does not exist', async () => {
    const { tableId } = await prepareBranch(prismaService);

    const command = new RemoveTableCommand({
      revisionId: 'unreal',
      tableId,
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if findTableInRevisionOrThrow fails', async () => {
    const { draftRevisionId } = await prepareBranch(prismaService);

    const command = new RemoveTableCommand({
      revisionId: draftRevisionId,
      tableId: 'unreal',
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'A table with this name does not exist in the revision',
    );
  });

  it('should throw an error if the table is a system table', async () => {
    const { draftRevisionId } = await prepareBranch(prismaService);

    const command = new RemoveTableCommand({
      revisionId: draftRevisionId,
      tableId: SystemTables.Schema,
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Table is a system table',
    );
  });

  it('should throw an error if the reference exists', async () => {
    const { draftRevisionId, schemaTableVersionId, tableId } =
      await prepareBranch(prismaService);
    const anotherTableId = nanoid();
    const anotherTableVersionId = nanoid();

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
    const data = {
      type: JsonSchemaTypeName.Object,
      properties: {
        ref: {
          type: JsonSchemaTypeName.String,
          reference: tableId,
          default: '',
        },
      },
    };
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
        data,
        hash: '',
        schemaHash: '',
      },
    });

    const command = new RemoveTableCommand({
      revisionId: draftRevisionId,
      tableId,
    });

    await expect(runTransaction(command)).rejects.toThrow(
      `There are references between ${tableId} and [${anotherTableId}]`,
    );
  });

  it('should remove the table if conditions are met', async () => {
    const { draftRevisionId, branchId, tableId } =
      await prepareBranch(prismaService);

    const command = new RemoveTableCommand({
      revisionId: draftRevisionId,
      tableId,
    });

    const result = await runTransaction(command);

    expect(result.revisionId).toBe(draftRevisionId);
    expect(result.branchId).toBe(branchId);

    const schemaForTable = await prismaService.row.findFirst({
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
    expect(schemaForTable).toBeNull();
  });

  it('should revert rows in the changelog if conditions are met', async () => {
    const { draftRevisionId, tableId, draftChangelogId } =
      await prepareBranch(prismaService);
    await prismaService.changelog.update({
      where: {
        id: draftChangelogId,
      },
      data: {
        rowInsertsCount: 3,
        rowUpdatesCount: 3,
        rowDeletesCount: 3,
        rowInserts: {
          another: { rows: { someRow: '' } },
          [tableId]: { rows: { someRow: '', some2Row: '' } },
        },
        rowUpdates: {
          another: { rows: { someRow: '' } },
          [tableId]: { rows: { someRow: '', some2Row: '' } },
        },
        rowDeletes: {
          another: { rows: { someRow: '' } },
          [tableId]: { rows: { someRow: '', some2Row: '' } },
        },
      },
    });

    const command = new RemoveTableCommand({
      revisionId: draftRevisionId,
      tableId,
    });

    await runTransaction(command);

    const changelog = await prismaService.changelog.findUniqueOrThrow({
      where: { id: draftChangelogId },
    });
    expect(changelog.rowInsertsCount).toBe(1);
    expect(changelog.rowUpdatesCount).toBe(1);
    expect(changelog.rowDeletesCount).toBe(2); // 3 - 2 = 1, then +1 for schema row for the table
    expect(changelog.rowInserts).toStrictEqual({
      another: { rows: { someRow: '' } },
    });
    expect(changelog.rowUpdates).toStrictEqual({
      another: { rows: { someRow: '' } },
    });
    expect(changelog.rowDeletes).toStrictEqual({
      another: { rows: { someRow: '' } },
      [SystemTables.Schema]: { rows: { [tableId]: '' } },
    });
  });

  it('should calculate hasChanges for the changelog if conditions are met', async () => {
    const { draftRevisionId, tableId, draftChangelogId } =
      await prepareBranch(prismaService);
    await prismaService.changelog.update({
      where: {
        id: draftChangelogId,
      },
      data: {
        hasChanges: false,
      },
    });

    const command = new RemoveTableCommand({
      revisionId: draftRevisionId,
      tableId,
    });

    await runTransaction(command);

    const changelog = await prismaService.changelog.findUniqueOrThrow({
      where: { id: draftChangelogId },
    });
    expect(changelog.hasChanges).toBe(true);
  });

  it('should disconnect the table if the table is readonly', async () => {
    const { draftRevisionId, tableId, draftTableVersionId } =
      await prepareBranch(prismaService);
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: true,
      },
    });

    const command = new RemoveTableCommand({
      revisionId: draftRevisionId,
      tableId,
    });

    await runTransaction(command);

    const table = await prismaService.table.findUnique({
      where: { versionId: draftTableVersionId },
    });
    expect(table).toBeTruthy();
  });

  it('should remove the table if the table is not readonly', async () => {
    const { draftRevisionId, tableId, draftTableVersionId } =
      await prepareBranch(prismaService);
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: false,
      },
    });

    const command = new RemoveTableCommand({
      revisionId: draftRevisionId,
      tableId,
    });

    await runTransaction(command);

    const table = await prismaService.table.findUnique({
      where: { versionId: draftTableVersionId },
    });
    expect(table).toBeNull();
  });

  it('should update changelog if the table is in tableInserts', async () => {
    const { draftRevisionId, tableId, draftChangelogId } =
      await prepareBranch(prismaService);
    await prismaService.changelog.update({
      where: {
        id: draftChangelogId,
      },
      data: {
        tableInsertsCount: 1,
        tableInserts: {
          anotherTable: '',
          [tableId]: '',
        },
      },
    });

    const command = new RemoveTableCommand({
      revisionId: draftRevisionId,
      tableId,
    });

    await runTransaction(command);

    const changelog = await prismaService.changelog.findUniqueOrThrow({
      where: { id: draftChangelogId },
    });
    expect(changelog.tableInsertsCount).toBe(0);
    expect(changelog.tableInserts).toStrictEqual({ anotherTable: '' });
  });

  it('should update changelog if the table is not in tableInserts', async () => {
    const { draftRevisionId, tableId, draftChangelogId } =
      await prepareBranch(prismaService);
    await prismaService.changelog.update({
      where: {
        id: draftChangelogId,
      },
      data: {
        tableDeletesCount: 1,
        tableDeletes: {
          anotherTable: '',
        },
      },
    });

    const command = new RemoveTableCommand({
      revisionId: draftRevisionId,
      tableId,
    });

    await runTransaction(command);

    const changelog = await prismaService.changelog.findUniqueOrThrow({
      where: { id: draftChangelogId },
    });
    expect(changelog.tableDeletesCount).toBe(2);
    expect(changelog.tableDeletes).toStrictEqual({
      anotherTable: '',
      [tableId]: '',
    });
  });

  function runTransaction(
    command: RemoveTableCommand,
  ): Promise<RemoveTableHandlerReturnType> {
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
