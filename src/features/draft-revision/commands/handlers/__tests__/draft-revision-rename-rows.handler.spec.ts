import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { DraftRevisionCreateRowsCommand } from 'src/features/draft-revision/commands/impl/draft-revision-create-rows.command';
import { DraftRevisionCreateTableCommand } from 'src/features/draft-revision/commands/impl/draft-revision-create-table.command';
import { DraftRevisionRenameRowsCommand } from 'src/features/draft-revision/commands/impl/draft-revision-rename-rows.command';
import {
  DraftRevisionCreateRowsCommandReturnType,
  DraftRevisionCreateTableCommandReturnType,
  DraftRevisionRenameRowsCommandReturnType,
} from 'src/features/draft-revision/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createDraftRevisionTestingModule,
  prepareDraftRevisionTest,
} from './utils';

describe('DraftRevisionRenameRowsHandler', () => {
  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;

  beforeAll(async () => {
    const result = await createDraftRevisionTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });

  async function createTableAndRows(
    revisionId: string,
    tableId: string,
    rows: { rowId: string; data: object }[],
  ): Promise<{
    tableResult: DraftRevisionCreateTableCommandReturnType;
    rowsResult: DraftRevisionCreateRowsCommandReturnType;
  }> {
    return transactionService.run(async () => {
      const tableResult: DraftRevisionCreateTableCommandReturnType =
        await commandBus.execute(
          new DraftRevisionCreateTableCommand({ revisionId, tableId }),
        );
      const rowsResult: DraftRevisionCreateRowsCommandReturnType =
        await commandBus.execute(
          new DraftRevisionCreateRowsCommand({
            revisionId,
            tableId,
            rows,
          }),
        );
      return { tableResult, rowsResult };
    });
  }

  function runInTransaction(
    command: DraftRevisionRenameRowsCommand,
  ): Promise<DraftRevisionRenameRowsCommandReturnType> {
    return transactionService.run(() => commandBus.execute(command));
  }

  describe('validation', () => {
    it('should throw an error if row does not exist', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await transactionService.run(() =>
        commandBus.execute(
          new DraftRevisionCreateTableCommand({
            revisionId: draftRevisionId,
            tableId: 'test-table',
          }),
        ),
      );

      const command = new DraftRevisionRenameRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        renames: [{ rowId: 'non-existent-row', nextRowId: 'new-row-id' }],
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow('not found');
    });

    it('should throw an error if new row id is empty', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTableAndRows(draftRevisionId, 'test-table', [
        { rowId: 'row-1', data: { test: 'value' } },
      ]);

      const command = new DraftRevisionRenameRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        renames: [{ rowId: 'row-1', nextRowId: '' }],
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'Row ID must be between 1 and 100 characters',
      );
    });

    it('should throw an error if new row id is the same as current', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTableAndRows(draftRevisionId, 'test-table', [
        { rowId: 'row-1', data: { test: 'value' } },
      ]);

      const command = new DraftRevisionRenameRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        renames: [{ rowId: 'row-1', nextRowId: 'row-1' }],
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'New row ID must be different from current',
      );
    });

    it('should throw an error if new row id already exists', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTableAndRows(draftRevisionId, 'test-table', [
        { rowId: 'row-1', data: { test: 'value1' } },
        { rowId: 'row-2', data: { test: 'value2' } },
      ]);

      const command = new DraftRevisionRenameRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        renames: [{ rowId: 'row-1', nextRowId: 'row-2' }],
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow('already exist');
    });

    it('should throw an error if duplicate source row ids', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTableAndRows(draftRevisionId, 'test-table', [
        { rowId: 'row-1', data: { test: 'value' } },
      ]);

      const command = new DraftRevisionRenameRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        renames: [
          { rowId: 'row-1', nextRowId: 'new-row-1' },
          { rowId: 'row-1', nextRowId: 'new-row-2' },
        ],
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'Duplicate source row IDs',
      );
    });

    it('should throw an error if duplicate target row ids', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTableAndRows(draftRevisionId, 'test-table', [
        { rowId: 'row-1', data: { test: 'value1' } },
        { rowId: 'row-2', data: { test: 'value2' } },
      ]);

      const command = new DraftRevisionRenameRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        renames: [
          { rowId: 'row-1', nextRowId: 'same-new-id' },
          { rowId: 'row-2', nextRowId: 'same-new-id' },
        ],
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'Duplicate target row IDs',
      );
    });
  });

  describe('success cases', () => {
    it('should rename single row successfully', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const { rowsResult } = await createTableAndRows(
        draftRevisionId,
        'test-table',
        [{ rowId: 'old-row-id', data: { test: 'value' } }],
      );

      const command = new DraftRevisionRenameRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        renames: [{ rowId: 'old-row-id', nextRowId: 'new-row-id' }],
      });

      const result = await runInTransaction(command);

      expect(result.renamedRows).toHaveLength(1);
      expect(result.renamedRows[0].rowVersionId).toBe(
        rowsResult.createdRows[0].rowVersionId,
      );

      const row = await prismaService.row.findUnique({
        where: { versionId: result.renamedRows[0].rowVersionId },
      });

      expect(row?.id).toBe('new-row-id');
    });

    it('should rename multiple rows successfully', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTableAndRows(draftRevisionId, 'test-table', [
        { rowId: 'row-1', data: { test: 'value1' } },
        { rowId: 'row-2', data: { test: 'value2' } },
      ]);

      const command = new DraftRevisionRenameRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        renames: [
          { rowId: 'row-1', nextRowId: 'new-row-1' },
          { rowId: 'row-2', nextRowId: 'new-row-2' },
        ],
      });

      const result = await runInTransaction(command);

      expect(result.renamedRows).toHaveLength(2);

      const row1 = await prismaService.row.findUnique({
        where: { versionId: result.renamedRows[0].rowVersionId },
      });
      expect(row1?.id).toBe('new-row-1');

      const row2 = await prismaService.row.findUnique({
        where: { versionId: result.renamedRows[1].rowVersionId },
      });
      expect(row2?.id).toBe('new-row-2');
    });

    it('should allow swap-like renames (nextRowId is another source rowId)', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTableAndRows(draftRevisionId, 'test-table', [
        { rowId: 'row-a', data: { test: 'value-a' } },
        { rowId: 'row-b', data: { test: 'value-b' } },
      ]);

      const command = new DraftRevisionRenameRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        renames: [
          { rowId: 'row-a', nextRowId: 'row-b' },
          { rowId: 'row-b', nextRowId: 'row-a' },
        ],
      });

      const result = await runInTransaction(command);

      expect(result.renamedRows).toHaveLength(2);
    });

    it('should preserve row data after rename', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const originalData = { field1: 'value1', field2: 123 };
      const { rowsResult } = await createTableAndRows(
        draftRevisionId,
        'test-table',
        [{ rowId: 'original-row', data: originalData }],
      );

      const command = new DraftRevisionRenameRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        renames: [{ rowId: 'original-row', nextRowId: 'renamed-row' }],
      });

      await runInTransaction(command);

      const row = await prismaService.row.findUnique({
        where: { versionId: rowsResult.createdRows[0].rowVersionId },
      });

      expect(row?.data).toEqual(originalData);
    });

    it('should preserve createdId after rename', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const { rowsResult } = await createTableAndRows(
        draftRevisionId,
        'test-table',
        [{ rowId: 'row-to-rename', data: { test: 'value' } }],
      );

      const command = new DraftRevisionRenameRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        renames: [{ rowId: 'row-to-rename', nextRowId: 'renamed-row' }],
      });

      const result = await runInTransaction(command);

      const row = await prismaService.row.findUnique({
        where: { versionId: result.renamedRows[0].rowVersionId },
      });

      expect(row?.createdId).toBe(rowsResult.createdRows[0].rowCreatedId);
    });

    it('should update updatedAt timestamp', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const { rowsResult } = await createTableAndRows(
        draftRevisionId,
        'test-table',
        [{ rowId: 'row-1', data: { test: 'value' } }],
      );

      const rowBefore = await prismaService.row.findUnique({
        where: { versionId: rowsResult.createdRows[0].rowVersionId },
      });
      const updatedAtBefore = rowBefore?.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const command = new DraftRevisionRenameRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        renames: [{ rowId: 'row-1', nextRowId: 'renamed-row' }],
      });

      const result = await runInTransaction(command);

      const rowAfter = await prismaService.row.findUnique({
        where: { versionId: result.renamedRows[0].rowVersionId },
      });

      expect(rowAfter?.updatedAt).not.toEqual(updatedAtBefore);
      expect(rowAfter?.updatedAt.getTime()).toBeGreaterThan(
        updatedAtBefore?.getTime() ?? 0,
      );
    });
  });

  describe('hasChanges', () => {
    it('should set hasChanges to true on revision', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTableAndRows(draftRevisionId, 'test-table', [
        { rowId: 'old-row-id', data: { test: 'value' } },
      ]);
      await prismaService.revision.update({
        where: { id: draftRevisionId },
        data: { hasChanges: false },
      });

      const revisionBefore = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        select: { hasChanges: true },
      });
      expect(revisionBefore?.hasChanges).toBe(false);

      const command = new DraftRevisionRenameRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        renames: [{ rowId: 'old-row-id', nextRowId: 'new-row-id' }],
      });

      await runInTransaction(command);

      const revisionAfter = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        select: { hasChanges: true },
      });
      expect(revisionAfter?.hasChanges).toBe(true);
    });
  });

  describe('versioning', () => {
    it('should create new row version when row is readonly', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const { rowsResult } = await createTableAndRows(
        draftRevisionId,
        'test-table',
        [{ rowId: 'row-1', data: { test: 'value' } }],
      );

      await prismaService.row.update({
        where: { versionId: rowsResult.createdRows[0].rowVersionId },
        data: { readonly: true },
      });

      const command = new DraftRevisionRenameRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        renames: [{ rowId: 'row-1', nextRowId: 'new-row-id' }],
      });

      const result = await runInTransaction(command);

      expect(result.renamedRows[0].rowVersionId).not.toBe(
        rowsResult.createdRows[0].rowVersionId,
      );
      expect(result.renamedRows[0].previousRowVersionId).toBe(
        rowsResult.createdRows[0].rowVersionId,
      );
    });

    it('should create new table version when table is readonly', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const { tableResult } = await createTableAndRows(
        draftRevisionId,
        'test-table',
        [{ rowId: 'row-1', data: { test: 'value' } }],
      );

      await prismaService.table.update({
        where: { versionId: tableResult.tableVersionId },
        data: { readonly: true },
      });

      const command = new DraftRevisionRenameRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        renames: [{ rowId: 'row-1', nextRowId: 'new-row-id' }],
      });

      const result = await runInTransaction(command);

      expect(result.tableVersionId).not.toBe(tableResult.tableVersionId);
      expect(result.previousTableVersionId).toBe(tableResult.tableVersionId);
    });
  });
});
