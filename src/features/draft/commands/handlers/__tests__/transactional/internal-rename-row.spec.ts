import { CommandBus } from '@nestjs/cqrs';
import {
  InternalRenameRowCommand,
  InternalRenameRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-rename-row.command';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createMock,
  createTestingModule,
  prepareBranch,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';

describe('InternalRenameRowHandler', () => {
  const nextRowId = 'nextRowId';

  it('should throw an error if the revision does not exist', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareBranch(prismaService);

    draftTransactionalCommands.resolveDraftRevision = createMock(
      new Error('Revision not found'),
    );

    const command = new InternalRenameRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      nextRowId,
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if the row does not exist', async () => {
    const { draftRevisionId, tableId } = await prepareBranch(prismaService);

    const command = new InternalRenameRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId: 'unrealRow',
      nextRowId,
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'A row with this name does not exist in the revision',
    );
  });

  it('should rename the row if conditions are met', async () => {
    const {
      draftRevisionId,
      tableId,
      rowId,
      rowCreatedId,
      draftTableVersionId,
      draftRowVersionId,
    } = await prepareBranch(prismaService);

    const command = new InternalRenameRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      nextRowId,
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).toBe(draftTableVersionId);
    expect(result.previousRowVersionId).toBe(draftRowVersionId);
    expect(result.rowVersionId).toBe(draftRowVersionId);

    const row = await prismaService.row.findFirstOrThrow({
      where: {
        id: nextRowId,
        tables: {
          some: {
            versionId: draftTableVersionId,
          },
        },
      },
    });
    expect(row.id).toBe(nextRowId);
    expect(row.versionId).toBe(draftRowVersionId);
    expect(row.createdId).toBe(rowCreatedId);
  });

  it('should rename the row in a new created table if conditions are met', async () => {
    const {
      draftRevisionId,
      tableId,
      rowId,
      rowCreatedId,
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

    const command = new InternalRenameRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      nextRowId,
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).not.toBe(draftTableVersionId);
    expect(result.previousRowVersionId).toBe(draftRowVersionId);
    expect(result.rowVersionId).toBe(draftRowVersionId);

    const row = await prismaService.row.findFirstOrThrow({
      where: {
        id: nextRowId,
        tables: {
          some: {
            versionId: draftTableVersionId,
          },
        },
      },
    });
    expect(row.id).toBe(nextRowId);
    expect(row.versionId).toBe(draftRowVersionId);
    expect(row.createdId).toBe(rowCreatedId);
  });

  it('should rename a new created row in the table if conditions are met', async () => {
    const {
      draftRevisionId,
      tableId,
      rowId,
      rowCreatedId,
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

    const command = new InternalRenameRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      nextRowId,
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).toBe(draftTableVersionId);
    expect(result.previousRowVersionId).toBe(draftRowVersionId);
    expect(result.rowVersionId).not.toBe(draftRowVersionId);

    const row = await prismaService.row.findFirstOrThrow({
      where: {
        id: nextRowId,
        tables: {
          some: {
            revisions: {
              some: {
                id: draftRevisionId,
              },
            },
          },
        },
      },
    });
    expect(row.id).toBe(nextRowId);
    expect(row.createdId).toBe(rowCreatedId);
    expect(row.versionId).not.toBe(draftRowVersionId);
  });

  function runTransaction(
    command: InternalRenameRowCommand,
  ): Promise<InternalRenameRowCommandReturnType> {
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
