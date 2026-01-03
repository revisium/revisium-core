import { CommandBus } from '@nestjs/cqrs';
import { prepareProject, prepareRow } from 'src/__tests__/utils/prepareProject';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createTestingModule,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { UpdateRowsCommand } from 'src/features/draft/commands/impl/update-rows.command';
import { UpdateRowsHandlerReturnType } from 'src/features/draft/commands/types/update-rows.handler.types';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { RowApiService } from 'src/features/row/row-api.service';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { PluginService } from 'src/features/plugin/plugin.service';

describe('UpdateRowsHandler', () => {
  it('should throw an error if the revision does not exist', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    jest
      .spyOn(draftTransactionalCommands, 'resolveDraftRevision')
      .mockRejectedValue(new Error('Revision not found'));

    const command = new UpdateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rows: [{ rowId, data: { ver: 3 } }],
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if the table is a system table', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new UpdateRowsCommand({
      revisionId: draftRevisionId,
      tableId: SystemTables.Schema,
      rows: [{ rowId: tableId, data: { ver: 3 } }],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Table is a system table',
    );
  });

  it('should throw an error if any row does not exist', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const command = new UpdateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rows: [
        { rowId, data: { ver: 3 } },
        { rowId: 'unrealRow', data: { ver: 4 } },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'A row with this name does not exist in the revision',
    );
  });

  it('should throw an error if any data is not valid', async () => {
    const {
      draftRevisionId,
      tableId,
      rowId,
      headTableVersionId,
      draftTableVersionId,
    } = await prepareProject(prismaService);

    const row2 = await prepareRow({
      prismaService,
      headTableVersionId,
      draftTableVersionId,
      data: { ver: 10 },
      dataDraft: { ver: 20 },
      schema: testSchema,
    });

    const command = new UpdateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rows: [
        { rowId, data: { ver: 3 } },
        { rowId: row2.rowId, data: { unrealKey: 3 } },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'missing required property "ver"',
    );
  });

  it('should update multiple rows if conditions are met', async () => {
    const {
      draftRevisionId,
      tableId,
      rowId,
      headTableVersionId,
      draftTableVersionId,
    } = await prepareProject(prismaService);

    const row2 = await prepareRow({
      prismaService,
      headTableVersionId,
      draftTableVersionId,
      data: { ver: 10 },
      dataDraft: { ver: 20 },
      schema: testSchema,
    });

    const command = new UpdateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rows: [
        { rowId, data: { ver: 100 } },
        { rowId: row2.rowId, data: { ver: 200 } },
      ],
    });

    const result = await runTransaction(command);

    expect(result.updatedRows).toHaveLength(2);
    expect(result.updatedRows[0].rowVersionId).toBeTruthy();
    expect(result.updatedRows[1].rowVersionId).toBeTruthy();

    const updatedRow1 = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });
    const updatedRow2 = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId: row2.rowId,
    });

    expect(updatedRow1).not.toBeNull();
    expect(updatedRow1?.data).toStrictEqual({ ver: 100 });
    expect(updatedRow2).not.toBeNull();
    expect(updatedRow2?.data).toStrictEqual({ ver: 200 });
  });

  it('should update a single row via bulk operation', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const command = new UpdateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rows: [{ rowId, data: { ver: 999 } }],
    });

    const result = await runTransaction(command);

    expect(result.updatedRows).toHaveLength(1);

    const row = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });
    expect(row).not.toBeNull();
    expect(row?.data).toStrictEqual({ ver: 999 });
  });

  it('should pass isRestore=true to plugin service', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const afterUpdateRowSpy = jest.spyOn(pluginService, 'afterUpdateRow');

    const command = new UpdateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rows: [{ rowId, data: { ver: 42 } }],
      isRestore: true,
    });

    await runTransaction(command);

    expect(afterUpdateRowSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        isRestore: true,
      }),
    );
  });

  it('should pass isRestore=false (undefined) to plugin service by default', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const afterUpdateRowSpy = jest.spyOn(pluginService, 'afterUpdateRow');

    const command = new UpdateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rows: [{ rowId, data: { ver: 42 } }],
    });

    await runTransaction(command);

    expect(afterUpdateRowSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        isRestore: undefined,
      }),
    );
  });

  function runTransaction(
    command: UpdateRowsCommand,
  ): Promise<UpdateRowsHandlerReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;
  let draftTransactionalCommands: DraftTransactionalCommands;
  let rowApiService: RowApiService;
  let pluginService: PluginService;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
    draftTransactionalCommands = result.draftTransactionalCommands;
    rowApiService = result.module.get<RowApiService>(RowApiService);
    pluginService = result.module.get<PluginService>(PluginService);
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
