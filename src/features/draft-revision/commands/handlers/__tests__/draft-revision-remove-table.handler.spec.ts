import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { DraftRevisionCreateRowsCommand } from 'src/features/draft-revision/commands/impl/draft-revision-create-rows.command';
import { DraftRevisionCreateTableCommand } from 'src/features/draft-revision/commands/impl/draft-revision-create-table.command';
import { DraftRevisionRemoveTableCommand } from 'src/features/draft-revision/commands/impl/draft-revision-remove-table.command';
import {
  DraftRevisionCreateTableCommandReturnType,
  DraftRevisionRemoveTableCommandReturnType,
} from 'src/features/draft-revision/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createDraftRevisionTestingModule,
  prepareDraftRevisionTest,
} from './utils';

describe('DraftRevisionRemoveTableHandler', () => {
  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;

  async function resetHasChanges(revisionId: string): Promise<void> {
    await prismaService.revision.update({
      where: { id: revisionId },
      data: { hasChanges: false },
    });
  }

  beforeAll(async () => {
    const result = await createDraftRevisionTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });

  async function createTable(
    revisionId: string,
    tableId: string,
  ): Promise<DraftRevisionCreateTableCommandReturnType> {
    return transactionService.run(() =>
      commandBus.execute(
        new DraftRevisionCreateTableCommand({ revisionId, tableId }),
      ),
    );
  }

  async function createTableWithRow(
    revisionId: string,
    tableId: string,
    rowId: string,
  ): Promise<DraftRevisionCreateTableCommandReturnType> {
    return transactionService.run(async () => {
      const tableResult: DraftRevisionCreateTableCommandReturnType =
        await commandBus.execute(
          new DraftRevisionCreateTableCommand({ revisionId, tableId }),
        );
      await commandBus.execute(
        new DraftRevisionCreateRowsCommand({
          revisionId,
          tableId,
          rows: [{ rowId, data: { test: 'value' } }],
        }),
      );
      return tableResult;
    });
  }

  function runInTransaction(
    command: DraftRevisionRemoveTableCommand,
  ): Promise<DraftRevisionRemoveTableCommandReturnType> {
    return transactionService.run(() => commandBus.execute(command));
  }

  describe('validation', () => {
    it('should throw an error if table does not exist', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);

      const command = new DraftRevisionRemoveTableCommand({
        revisionId: draftRevisionId,
        tableId: 'non-existent-table',
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'not found in revision',
      );
    });

    it('should throw an error if revision has no parent', async () => {
      const { headRevisionId } = await prepareDraftRevisionTest(prismaService);

      await prismaService.revision.update({
        where: { id: headRevisionId },
        data: { isDraft: true },
      });

      const tableResult = await createTable(headRevisionId, 'test-table');
      expect(tableResult.tableVersionId).toBeDefined();

      const command = new DraftRevisionRemoveTableCommand({
        revisionId: headRevisionId,
        tableId: 'test-table',
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'Parent revision not found',
      );
    });
  });

  describe('success cases', () => {
    it('should delete table when table is not readonly', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const tableResult = await createTable(draftRevisionId, 'test-table');

      const command = new DraftRevisionRemoveTableCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
      });

      const result = await runInTransaction(command);

      expect(result.tableVersionId).toBe(tableResult.tableVersionId);
      expect(result.deleted).toBe(true);

      const table = await prismaService.table.findUnique({
        where: { versionId: tableResult.tableVersionId },
      });

      expect(table).toBeNull();
    });

    it('should delete table and its rows when rows are only linked to this table', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const tableResult = await createTableWithRow(
        draftRevisionId,
        'test-table',
        'row-1',
      );

      const rowBefore = await prismaService.row.findFirst({
        where: {
          id: 'row-1',
          tables: { some: { versionId: tableResult.tableVersionId } },
        },
      });
      expect(rowBefore).not.toBeNull();

      const command = new DraftRevisionRemoveTableCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
      });

      const result = await runInTransaction(command);

      expect(result.deleted).toBe(true);

      const table = await prismaService.table.findUnique({
        where: { versionId: tableResult.tableVersionId },
      });
      expect(table).toBeNull();

      const rowAfter = await prismaService.row.findUnique({
        where: { versionId: rowBefore?.versionId },
      });
      expect(rowAfter).toBeNull();
    });

    it('should disconnect table when table is readonly', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const tableResult = await createTable(draftRevisionId, 'test-table');

      await prismaService.table.update({
        where: { versionId: tableResult.tableVersionId },
        data: { readonly: true },
      });

      const command = new DraftRevisionRemoveTableCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
      });

      const result = await runInTransaction(command);

      expect(result.tableVersionId).toBe(tableResult.tableVersionId);
      expect(result.deleted).toBe(false);

      const table = await prismaService.table.findUnique({
        where: { versionId: tableResult.tableVersionId },
        include: { revisions: true },
      });

      expect(table).not.toBeNull();
      expect(table?.revisions.some((r) => r.id === draftRevisionId)).toBe(
        false,
      );
    });
  });

  describe('hasChanges', () => {
    it('should set hasChanges to false when all changes are removed', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTable(draftRevisionId, 'test-table');
      await resetHasChanges(draftRevisionId);

      const revisionBefore = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        select: { hasChanges: true },
      });
      expect(revisionBefore?.hasChanges).toBe(false);

      const command = new DraftRevisionRemoveTableCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
      });

      await runInTransaction(command);

      const revisionAfter = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        select: { hasChanges: true },
      });
      expect(revisionAfter?.hasChanges).toBe(false);
    });

    it('should keep hasChanges true when other changes remain', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTable(draftRevisionId, 'table-to-keep');
      await createTable(draftRevisionId, 'table-to-remove');

      const revisionBefore = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        select: { hasChanges: true },
      });
      expect(revisionBefore?.hasChanges).toBe(true);

      const command = new DraftRevisionRemoveTableCommand({
        revisionId: draftRevisionId,
        tableId: 'table-to-remove',
      });

      await runInTransaction(command);

      const revisionAfter = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        select: { hasChanges: true },
      });
      expect(revisionAfter?.hasChanges).toBe(true);
    });
  });
});
