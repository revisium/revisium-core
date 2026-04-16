import { BadRequestException } from '@nestjs/common';
import { DraftRevisionCreateRowsCommand } from 'src/features/draft-revision/commands/impl/draft-revision-create-rows.command';
import { DraftRevisionCreateTableCommand } from 'src/features/draft-revision/commands/impl/draft-revision-create-table.command';
import { DraftRevisionRemoveRowsCommand } from 'src/features/draft-revision/commands/impl/draft-revision-remove-rows.command';
import {
  DraftRevisionCreateRowsCommandReturnType,
  DraftRevisionCreateTableCommandReturnType,
  DraftRevisionRemoveRowsCommandReturnType,
} from 'src/features/draft-revision/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  createDraftRevisionCommandTestKit,
  type DraftRevisionCommandTestKit,
} from 'src/testing/kit/create-draft-revision-command-test-kit';
import { givenDraftRevision } from 'src/testing/scenarios/given-draft-revision';

describe('DraftRevisionRemoveRowsHandler', () => {
  let kit: DraftRevisionCommandTestKit;
  let prismaService: PrismaService;

  beforeAll(async () => {
    kit = await createDraftRevisionCommandTestKit();
    prismaService = kit.prismaService;
  });

  afterAll(async () => {
    await kit.close();
  });

  async function createTable(
    revisionId: string,
    tableId: string,
  ): Promise<DraftRevisionCreateTableCommandReturnType> {
    return kit.executeSerializable(
      new DraftRevisionCreateTableCommand({ revisionId, tableId }),
    );
  }

  async function createTableAndRows(
    revisionId: string,
    tableId: string,
    rows: { rowId: string; data: object }[],
  ): Promise<{
    tableResult: DraftRevisionCreateTableCommandReturnType;
    rowsResult: DraftRevisionCreateRowsCommandReturnType;
  }> {
    return kit.transactionService.runSerializable(async () => {
      const tableResult: DraftRevisionCreateTableCommandReturnType =
        await kit.commandBus.execute(
          new DraftRevisionCreateTableCommand({ revisionId, tableId }),
        );
      const rowsResult: DraftRevisionCreateRowsCommandReturnType =
        await kit.commandBus.execute(
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
    command: DraftRevisionRemoveRowsCommand,
  ): Promise<DraftRevisionRemoveRowsCommandReturnType> {
    return kit.executeSerializable(command);
  }

  describe('validation', () => {
    it('should throw an error if revision is not draft', async () => {
      const { headRevisionId } = await givenDraftRevision(prismaService);

      const command = new DraftRevisionRemoveRowsCommand({
        revisionId: headRevisionId,
        tableId: 'test-table',
        rowIds: ['row-1'],
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'The revision is not a draft',
      );
    });

    it('should throw an error if row does not exist', async () => {
      const { draftRevisionId } = await givenDraftRevision(prismaService);
      await createTable(draftRevisionId, 'test-table');

      const command = new DraftRevisionRemoveRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rowIds: ['non-existent-row'],
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow('not found');
    });

    it('should throw an error if any of rows do not exist', async () => {
      const { draftRevisionId } = await givenDraftRevision(prismaService);
      await createTableAndRows(draftRevisionId, 'test-table', [
        { rowId: 'row-1', data: { test: 'value' } },
      ]);

      const command = new DraftRevisionRemoveRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rowIds: ['row-1', 'non-existent-row'],
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow('not found');
    });

    it('should throw an error if table does not exist', async () => {
      const { draftRevisionId } = await givenDraftRevision(prismaService);

      const command = new DraftRevisionRemoveRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'non-existent-table',
        rowIds: ['row-1'],
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'not found in revision',
      );
    });
  });

  describe('success cases', () => {
    it('should delete multiple rows when only linked to one table', async () => {
      const { draftRevisionId } = await givenDraftRevision(prismaService);
      const { rowsResult } = await createTableAndRows(
        draftRevisionId,
        'test-table',
        [
          { rowId: 'row-1', data: { test: 'value1' } },
          { rowId: 'row-2', data: { test: 'value2' } },
        ],
      );

      const command = new DraftRevisionRemoveRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rowIds: ['row-1', 'row-2'],
      });

      const result = await runInTransaction(command);

      expect(result.removedRows).toHaveLength(2);
      expect(result.removedRows[0].deleted).toBe(true);
      expect(result.removedRows[1].deleted).toBe(true);

      const row1 = await prismaService.row.findUnique({
        where: { versionId: rowsResult.createdRows[0].rowVersionId },
      });
      expect(row1).toBeNull();

      const row2 = await prismaService.row.findUnique({
        where: { versionId: rowsResult.createdRows[1].rowVersionId },
      });
      expect(row2).toBeNull();
    });

    it('should delete single row (array of one element)', async () => {
      const { draftRevisionId } = await givenDraftRevision(prismaService);
      const { rowsResult } = await createTableAndRows(
        draftRevisionId,
        'test-table',
        [{ rowId: 'row-1', data: { test: 'value' } }],
      );

      const command = new DraftRevisionRemoveRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rowIds: ['row-1'],
      });

      const result = await runInTransaction(command);

      expect(result.removedRows).toHaveLength(1);
      expect(result.removedRows[0].rowVersionId).toBe(
        rowsResult.createdRows[0].rowVersionId,
      );
      expect(result.removedRows[0].deleted).toBe(true);

      const row = await prismaService.row.findUnique({
        where: { versionId: rowsResult.createdRows[0].rowVersionId },
      });
      expect(row).toBeNull();
    });

    it('should disconnect row when row is readonly (committed)', async () => {
      const { draftRevisionId } = await givenDraftRevision(prismaService);
      const { tableResult, rowsResult } = await createTableAndRows(
        draftRevisionId,
        'test-table',
        [{ rowId: 'row-1', data: { test: 'value' } }],
      );

      await prismaService.row.update({
        where: { versionId: rowsResult.createdRows[0].rowVersionId },
        data: { readonly: true },
      });

      const command = new DraftRevisionRemoveRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rowIds: ['row-1'],
      });

      const result = await runInTransaction(command);

      expect(result.removedRows).toHaveLength(1);
      expect(result.removedRows[0].rowVersionId).toBe(
        rowsResult.createdRows[0].rowVersionId,
      );
      expect(result.removedRows[0].deleted).toBe(false);

      const row = await prismaService.row.findUnique({
        where: { versionId: rowsResult.createdRows[0].rowVersionId },
        include: { tables: true },
      });

      expect(row).not.toBeNull();
      expect(
        row?.tables.some((t) => t.versionId === tableResult.tableVersionId),
      ).toBe(false);
    });

    it('should delete row when row is not readonly (draft)', async () => {
      const { draftRevisionId } = await givenDraftRevision(prismaService);
      const { rowsResult } = await createTableAndRows(
        draftRevisionId,
        'test-table',
        [{ rowId: 'row-1', data: { test: 'value' } }],
      );

      const command = new DraftRevisionRemoveRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rowIds: ['row-1'],
      });

      const result = await runInTransaction(command);

      expect(result.removedRows).toHaveLength(1);
      expect(result.removedRows[0].rowVersionId).toBe(
        rowsResult.createdRows[0].rowVersionId,
      );
      expect(result.removedRows[0].deleted).toBe(true);

      const row = await prismaService.row.findUnique({
        where: { versionId: rowsResult.createdRows[0].rowVersionId },
      });
      expect(row).toBeNull();
    });

    it('should deduplicate rowIds in request', async () => {
      const { draftRevisionId } = await givenDraftRevision(prismaService);
      const { rowsResult } = await createTableAndRows(
        draftRevisionId,
        'test-table',
        [{ rowId: 'row-1', data: { test: 'value' } }],
      );

      const command = new DraftRevisionRemoveRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rowIds: ['row-1', 'row-1', 'row-1'],
      });

      const result = await runInTransaction(command);

      expect(result.removedRows).toHaveLength(1);
      expect(result.removedRows[0].rowVersionId).toBe(
        rowsResult.createdRows[0].rowVersionId,
      );

      const row = await prismaService.row.findUnique({
        where: { versionId: rowsResult.createdRows[0].rowVersionId },
      });
      expect(row).toBeNull();
    });
  });

  describe('versioning', () => {
    it('should create new table version when table is readonly', async () => {
      const { draftRevisionId } = await givenDraftRevision(prismaService);
      const { tableResult } = await createTableAndRows(
        draftRevisionId,
        'test-table',
        [{ rowId: 'row-1', data: { test: 'value' } }],
      );

      await prismaService.table.update({
        where: { versionId: tableResult.tableVersionId },
        data: { readonly: true },
      });

      const command = new DraftRevisionRemoveRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rowIds: ['row-1'],
      });

      const result = await runInTransaction(command);

      expect(result.tableVersionId).not.toBe(tableResult.tableVersionId);
      expect(result.previousTableVersionId).toBe(tableResult.tableVersionId);
    });

    it('should reuse table version when table is not readonly', async () => {
      const { draftRevisionId } = await givenDraftRevision(prismaService);
      const { tableResult } = await createTableAndRows(
        draftRevisionId,
        'test-table',
        [{ rowId: 'row-1', data: { test: 'value' } }],
      );

      const command = new DraftRevisionRemoveRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rowIds: ['row-1'],
      });

      const result = await runInTransaction(command);

      expect(result.tableVersionId).toBe(tableResult.tableVersionId);
      expect(result.previousTableVersionId).toBe(tableResult.tableVersionId);
    });
  });

  describe('hasChanges', () => {
    it('should keep table in draft when removing all rows from new table (not in head)', async () => {
      const { draftRevisionId } = await givenDraftRevision(prismaService);
      await createTableAndRows(draftRevisionId, 'test-table', [
        { rowId: 'row-1', data: { test: 'value' } },
      ]);

      const command = new DraftRevisionRemoveRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rowIds: ['row-1'],
      });

      await runInTransaction(command);

      const tableInDraft = await prismaService.table.findFirst({
        where: {
          id: 'test-table',
          revisions: { some: { id: draftRevisionId } },
        },
      });
      expect(tableInDraft).not.toBeNull();

      const revisionAfter = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        select: { hasChanges: true },
      });
      expect(revisionAfter?.hasChanges).toBe(true);
    });

    it('should keep table in draft when bulk removing all rows from new table (not in head)', async () => {
      const { draftRevisionId } = await givenDraftRevision(prismaService);
      await createTableAndRows(draftRevisionId, 'test-table', [
        { rowId: 'row-1', data: { test: 'value1' } },
        { rowId: 'row-2', data: { test: 'value2' } },
        { rowId: 'row-3', data: { test: 'value3' } },
      ]);

      const command = new DraftRevisionRemoveRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rowIds: ['row-1', 'row-2', 'row-3'],
      });

      await runInTransaction(command);

      const tableInDraft = await prismaService.table.findFirst({
        where: {
          id: 'test-table',
          revisions: { some: { id: draftRevisionId } },
        },
      });
      expect(tableInDraft).not.toBeNull();

      const revisionAfter = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        select: { hasChanges: true },
      });
      expect(revisionAfter?.hasChanges).toBe(true);
    });

    it('should keep hasChanges true when other rows remain', async () => {
      const { draftRevisionId } = await givenDraftRevision(prismaService);
      await createTableAndRows(draftRevisionId, 'test-table', [
        { rowId: 'row-to-keep', data: { test: 'value1' } },
        { rowId: 'row-to-remove', data: { test: 'value2' } },
      ]);

      const revisionBefore = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        select: { hasChanges: true },
      });
      expect(revisionBefore?.hasChanges).toBe(true);

      const command = new DraftRevisionRemoveRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rowIds: ['row-to-remove'],
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
