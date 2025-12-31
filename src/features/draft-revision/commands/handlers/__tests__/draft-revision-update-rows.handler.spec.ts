import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import objectHash from 'object-hash';
import { DraftRevisionCreateRowsCommand } from 'src/features/draft-revision/commands/impl/draft-revision-create-rows.command';
import { DraftRevisionCreateTableCommand } from 'src/features/draft-revision/commands/impl/draft-revision-create-table.command';
import { DraftRevisionUpdateRowsCommand } from 'src/features/draft-revision/commands/impl/draft-revision-update-rows.command';
import {
  DraftRevisionCreateRowsCommandReturnType,
  DraftRevisionCreateTableCommandReturnType,
  DraftRevisionUpdateRowsCommandReturnType,
} from 'src/features/draft-revision/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createDraftRevisionTestingModule,
  prepareDraftRevisionTest,
} from './utils';

describe('DraftRevisionUpdateRowsHandler', () => {
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
    command: DraftRevisionUpdateRowsCommand,
  ): Promise<DraftRevisionUpdateRowsCommandReturnType> {
    return transactionService.run(() => commandBus.execute(command));
  }

  describe('validation', () => {
    it('should throw an error if revision is not draft', async () => {
      const { headRevisionId } = await prepareDraftRevisionTest(prismaService);

      const command = new DraftRevisionUpdateRowsCommand({
        revisionId: headRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: 'row-1', data: { updated: 'data' } }],
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'The revision is not a draft',
      );
    });

    it('should throw an error if rowId is empty', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTableAndRows(draftRevisionId, 'test-table', [
        { rowId: 'row-1', data: { original: 'data' } },
      ]);

      const command = new DraftRevisionUpdateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: '', data: { updated: 'data' } }],
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'Row ID must be between 1 and 100 characters',
      );
    });

    it('should throw an error if row does not exist', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTableAndRows(draftRevisionId, 'test-table', [
        { rowId: 'row-1', data: { original: 'data' } },
      ]);

      const command = new DraftRevisionUpdateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: 'non-existent-row', data: { updated: 'data' } }],
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow('not found');
    });
  });

  describe('success cases', () => {
    it('should update multiple rows and recalculate hashes', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const { rowsResult } = await createTableAndRows(
        draftRevisionId,
        'test-table',
        [
          { rowId: 'row-1', data: { original: 'data1' } },
          { rowId: 'row-2', data: { original: 'data2' } },
        ],
      );

      const newData1 = { updated: 'data1', extra: 1 };
      const newData2 = { updated: 'data2', extra: 2 };
      const command = new DraftRevisionUpdateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [
          { rowId: 'row-1', data: newData1 },
          { rowId: 'row-2', data: newData2 },
        ],
      });

      const result = await runInTransaction(command);

      expect(result.updatedRows).toHaveLength(2);

      const row1 = await prismaService.row.findUnique({
        where: { versionId: rowsResult.createdRows[0].rowVersionId },
      });

      expect(row1?.data).toEqual(newData1);
      expect(row1?.hash).toBe(objectHash(newData1));

      const row2 = await prismaService.row.findUnique({
        where: { versionId: rowsResult.createdRows[1].rowVersionId },
      });

      expect(row2?.data).toEqual(newData2);
      expect(row2?.hash).toBe(objectHash(newData2));
    });

    it('should update single row (array of one element)', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const { rowsResult } = await createTableAndRows(
        draftRevisionId,
        'test-table',
        [{ rowId: 'row-1', data: { original: 'data' } }],
      );

      const newData = { updated: 'data', extra: 123 };
      const command = new DraftRevisionUpdateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: 'row-1', data: newData }],
      });

      const result = await runInTransaction(command);

      expect(result.updatedRows).toHaveLength(1);
      expect(result.updatedRows[0].rowVersionId).toBe(
        rowsResult.createdRows[0].rowVersionId,
      );

      const row = await prismaService.row.findUnique({
        where: { versionId: result.updatedRows[0].rowVersionId },
      });

      expect(row?.data).toEqual(newData);
      expect(row?.hash).toBe(objectHash(newData));
    });

    it('should update schemaHash if provided', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTableAndRows(draftRevisionId, 'test-table', [
        { rowId: 'row-1', data: { original: 'data' } },
      ]);

      const newSchemaHash = 'new-schema-hash';
      const command = new DraftRevisionUpdateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [
          {
            rowId: 'row-1',
            data: { updated: 'data' },
            schemaHash: newSchemaHash,
          },
        ],
      });

      const result = await runInTransaction(command);

      const row = await prismaService.row.findUnique({
        where: { versionId: result.updatedRows[0].rowVersionId },
      });

      expect(row?.schemaHash).toBe(newSchemaHash);
    });

    it('should update meta if provided', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTableAndRows(draftRevisionId, 'test-table', [
        { rowId: 'row-1', data: { original: 'data' } },
      ]);

      const newMeta = { version: 2, patches: [{ op: 'replace' }] };
      const command = new DraftRevisionUpdateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: 'row-1', data: { updated: 'data' }, meta: newMeta }],
      });

      const result = await runInTransaction(command);

      const row = await prismaService.row.findUnique({
        where: { versionId: result.updatedRows[0].rowVersionId },
      });

      expect(row?.meta).toEqual(newMeta);
    });

    it('should update publishedAt if provided', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTableAndRows(draftRevisionId, 'test-table', [
        { rowId: 'row-1', data: { original: 'data' } },
      ]);

      const newPublishedAt = new Date('2025-12-15T10:00:00.000Z');
      const command = new DraftRevisionUpdateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [
          {
            rowId: 'row-1',
            data: { updated: 'data' },
            publishedAt: newPublishedAt,
          },
        ],
      });

      const result = await runInTransaction(command);

      const row = await prismaService.row.findUnique({
        where: { versionId: result.updatedRows[0].rowVersionId },
      });

      expect(row?.publishedAt).toEqual(newPublishedAt);
    });

    it('should update updatedAt timestamp', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const { rowsResult } = await createTableAndRows(
        draftRevisionId,
        'test-table',
        [{ rowId: 'row-1', data: { original: 'data' } }],
      );

      const rowBefore = await prismaService.row.findUnique({
        where: { versionId: rowsResult.createdRows[0].rowVersionId },
      });
      const updatedAtBefore = rowBefore?.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const command = new DraftRevisionUpdateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: 'row-1', data: { updated: 'data' } }],
      });

      const result = await runInTransaction(command);

      const rowAfter = await prismaService.row.findUnique({
        where: { versionId: result.updatedRows[0].rowVersionId },
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
        { rowId: 'row-1', data: { original: 'data' } },
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

      const command = new DraftRevisionUpdateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: 'row-1', data: { updated: 'data' } }],
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
        [{ rowId: 'row-1', data: { original: 'data' } }],
      );

      await prismaService.row.update({
        where: { versionId: rowsResult.createdRows[0].rowVersionId },
        data: { readonly: true },
      });

      const command = new DraftRevisionUpdateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: 'row-1', data: { updated: 'data' } }],
      });

      const result = await runInTransaction(command);

      expect(result.updatedRows[0].rowVersionId).not.toBe(
        rowsResult.createdRows[0].rowVersionId,
      );
      expect(result.updatedRows[0].previousRowVersionId).toBe(
        rowsResult.createdRows[0].rowVersionId,
      );
    });

    it('should create new table version when table is readonly', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const { tableResult } = await createTableAndRows(
        draftRevisionId,
        'test-table',
        [{ rowId: 'row-1', data: { original: 'data' } }],
      );

      await prismaService.table.update({
        where: { versionId: tableResult.tableVersionId },
        data: { readonly: true },
      });

      const command = new DraftRevisionUpdateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: 'row-1', data: { updated: 'data' } }],
      });

      const result = await runInTransaction(command);

      expect(result.tableVersionId).not.toBe(tableResult.tableVersionId);
      expect(result.previousTableVersionId).toBe(tableResult.tableVersionId);
    });

    it('should reuse versions when not readonly', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const { tableResult, rowsResult } = await createTableAndRows(
        draftRevisionId,
        'test-table',
        [{ rowId: 'row-1', data: { original: 'data' } }],
      );

      const command = new DraftRevisionUpdateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: 'row-1', data: { updated: 'data' } }],
      });

      const result = await runInTransaction(command);

      expect(result.tableVersionId).toBe(tableResult.tableVersionId);
      expect(result.updatedRows[0].rowVersionId).toBe(
        rowsResult.createdRows[0].rowVersionId,
      );
    });

    it('should preserve createdId when creating new version from readonly row', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const { rowsResult } = await createTableAndRows(
        draftRevisionId,
        'test-table',
        [{ rowId: 'row-1', data: { original: 'data' } }],
      );

      await prismaService.row.update({
        where: { versionId: rowsResult.createdRows[0].rowVersionId },
        data: { readonly: true },
      });

      const command = new DraftRevisionUpdateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: 'row-1', data: { updated: 'data' } }],
      });

      const result = await runInTransaction(command);

      const newRow = await prismaService.row.findUnique({
        where: { versionId: result.updatedRows[0].rowVersionId },
      });

      expect(newRow?.createdId).toBe(rowsResult.createdRows[0].rowCreatedId);
    });

    it('should preserve meta when creating new version from readonly row', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const { rowsResult } = await createTableAndRows(
        draftRevisionId,
        'test-table',
        [{ rowId: 'row-1', data: { original: 'data' } }],
      );

      const originalMeta = { previousValue: 1, history: [] };
      await prismaService.row.update({
        where: { versionId: rowsResult.createdRows[0].rowVersionId },
        data: { readonly: true, meta: originalMeta },
      });

      const command = new DraftRevisionUpdateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: 'row-1', data: { updated: 'data' } }],
      });

      const result = await runInTransaction(command);

      const newRow = await prismaService.row.findUnique({
        where: { versionId: result.updatedRows[0].rowVersionId },
      });

      expect(newRow?.meta).toEqual(originalMeta);
    });
  });
});
