import { CommandBus } from '@nestjs/cqrs';
import {
  InternalUpdateRowCommand,
  InternalUpdateRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-update-row.command';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createMock,
  createTestingModule,
  prepareBranch,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import * as objectHash from 'object-hash';

describe('InternalUpdateRowHandler', () => {
  it('should throw an error if the revision does not exist', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareBranch(prismaService);

    draftTransactionalCommands.resolveDraftRevision = createMock(
      new Error('Revision not found'),
    );

    const command = new InternalUpdateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if the row does not exist', async () => {
    const { draftRevisionId, tableId } = await prepareBranch(prismaService);

    const command = new InternalUpdateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId: 'unrealRow',
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'A row with this name does not exist in the revision',
    );
  });

  it('should update the row if conditions are met', async () => {
    const {
      draftRevisionId,
      tableId,
      rowId,
      draftTableVersionId,
      draftRowVersionId,
    } = await prepareBranch(prismaService);

    const command = new InternalUpdateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
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
  });

  it('should update the row in a new created table if conditions are met', async () => {
    const {
      draftRevisionId,
      tableId,
      rowId,
      draftTableVersionId,
      draftRowVersionId,
    } = await prepareBranch(prismaService);
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: true,
      },
    });

    const command = new InternalUpdateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).not.toBe(draftTableVersionId);
    expect(result.previousRowVersionId).toBe(draftRowVersionId);
    expect(result.rowVersionId).toBe(draftRowVersionId);
  });

  it('should update a new created row in the table if conditions are met', async () => {
    const {
      draftRevisionId,
      tableId,
      rowId,
      draftTableVersionId,
      draftRowVersionId,
    } = await prepareBranch(prismaService);
    await prismaService.row.update({
      where: {
        versionId: draftRowVersionId,
      },
      data: {
        readonly: true,
      },
    });

    const command = new InternalUpdateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).toBe(draftTableVersionId);
    expect(result.previousRowVersionId).toBe(draftRowVersionId);
    expect(result.rowVersionId).not.toBe(draftRowVersionId);
  });

  function runTransaction(
    command: InternalUpdateRowCommand,
  ): Promise<InternalUpdateRowCommandReturnType> {
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
