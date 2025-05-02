import { CommandBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import {
  prepareProject,
  PrepareProjectReturnType,
  prepareRow,
  prepareTableWithSchema,
} from 'src/__tests__/utils/prepareProject';
import {
  getArraySchema,
  getObjectSchema,
  getRefSchema,
} from 'src/__tests__/utils/schema/schema.mocks';
import { FileStatus } from 'src/features/plugin/file.plugin';
import { SystemSchemaIds } from 'src/features/share/schema-ids.consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createMock,
  createTestingModule,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { UpdateRowCommand } from 'src/features/draft/commands/impl/update-row.command';
import { UpdateRowHandlerReturnType } from 'src/features/draft/commands/types/update-row.handler.types';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { SystemTables } from 'src/features/share/system-tables.consts';
import * as objectHash from 'object-hash';

describe('UpdateRowHandler', () => {
  it('should throw an error if the revision does not exist', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    draftTransactionalCommands.resolveDraftRevision = createMock(
      new Error('Revision not found'),
    );

    const command = new UpdateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      data: { ver: 3 },
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if the table is a system table', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new UpdateRowCommand({
      revisionId: draftRevisionId,
      tableId: SystemTables.Schema,
      rowId: tableId,
      data: { ver: 3 },
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Table is a system table',
    );
  });

  it('should throw an error if the row does not exist', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new UpdateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId: 'unrealRow',
      data: { ver: 3 },
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'A row with this name does not exist in the revision',
    );
  });

  it('should throw an error if the data is not valid', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const command = new UpdateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      data: { unrealKey: 3 },
    });

    await expect(runTransaction(command)).rejects.toThrow('data is not valid');
  });

  it('should update the row if conditions are met', async () => {
    const ids = await prepareProject(prismaService);
    const {
      draftRevisionId,
      tableId,
      rowId,
      draftTableVersionId,
      draftRowVersionId,
      rowCreatedId,
    } = ids;

    const command = new UpdateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      data: { ver: 3 },
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).toBe(draftTableVersionId);
    expect(result.previousRowVersionId).toBe(draftRowVersionId);
    expect(result.rowVersionId).toBe(draftRowVersionId);

    const row = await prismaService.row.findFirstOrThrow({
      where: {
        id: rowId,
        tables: {
          some: {
            versionId: draftTableVersionId,
          },
        },
      },
    });
    expect(row.data).toStrictEqual({ ver: 3 });
    expect(row.hash).toBe(objectHash({ ver: 3 }));
    expect(row.schemaHash).toBe(objectHash(testSchema));
    expect(row.createdId).toBe(rowCreatedId);
    await revisionCheck(ids);
  });

  it('should update the row in a new created table if conditions are met', async () => {
    const ids = await prepareProject(prismaService);
    const {
      draftRevisionId,
      tableId,
      rowId,
      draftTableVersionId,
      draftRowVersionId,
    } = ids;
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: true,
      },
    });

    const command = new UpdateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      data: { ver: 3 },
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).not.toBe(draftTableVersionId);
    expect(result.previousRowVersionId).toBe(draftRowVersionId);
    expect(result.rowVersionId).toBe(draftRowVersionId);
    await revisionCheck(ids);
  });

  it('should update a new created row in the table if conditions are met', async () => {
    const ids = await prepareProject(prismaService);
    const {
      draftRevisionId,
      tableId,
      rowId,
      draftTableVersionId,
      draftRowVersionId,
    } = ids;
    await prismaService.row.update({
      where: {
        versionId: draftRowVersionId,
      },
      data: {
        readonly: true,
      },
    });

    const command = new UpdateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      data: { ver: 3 },
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).toBe(draftTableVersionId);
    expect(result.previousRowVersionId).toBe(draftRowVersionId);
    expect(result.rowVersionId).not.toBe(draftRowVersionId);
    await revisionCheck(ids);
  });

  it('should update row with refs', async () => {
    const ids = await prepareProject(prismaService);
    const { headRevisionId, draftRevisionId, schemaTableVersionId } = ids;

    const table = await prepareTableWithSchema({
      prismaService,
      headRevisionId,
      draftRevisionId,
      schemaTableVersionId,
      schema: getObjectSchema({
        file: getRefSchema(SystemSchemaIds.File),
        files: getArraySchema(getRefSchema(SystemSchemaIds.File)),
      }),
    });

    const file = {
      status: FileStatus.ready,
      fileId: nanoid(),
      url: '',
      fileName: '',
      hash: '',
      extension: '',
      mimeType: '',
      size: 0,
      width: 0,
      height: 0,
    };
    const data = {
      file,
      files: [],
    };

    const { rowDraft } = await prepareRow({
      prismaService,
      headTableVersionId: table.headTableVersionId,
      draftTableVersionId: table.draftTableVersionId,
      schema: table.schema,
      data: data,
      dataDraft: data,
    });

    const command = new UpdateRowCommand({
      revisionId: draftRevisionId,
      tableId: table.tableId,
      rowId: rowDraft.id,
      data: { file, files: [file] },
    });

    await runTransaction(command);
  });

  async function revisionCheck(ids: PrepareProjectReturnType) {
    const { draftRevisionId } = ids;

    const revision = await prismaService.revision.findFirstOrThrow({
      where: { id: draftRevisionId },
    });
    expect(revision.hasChanges).toBe(true);
  }

  function runTransaction(
    command: UpdateRowCommand,
  ): Promise<UpdateRowHandlerReturnType> {
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
