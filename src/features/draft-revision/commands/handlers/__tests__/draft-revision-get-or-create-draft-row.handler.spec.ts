import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { DraftRevisionCreateRowsCommand } from 'src/features/draft-revision/commands/impl/draft-revision-create-rows.command';
import { DraftRevisionCreateTableCommand } from 'src/features/draft-revision/commands/impl/draft-revision-create-table.command';
import { DraftRevisionGetOrCreateDraftRowCommand } from 'src/features/draft-revision/commands/impl/draft-revision-get-or-create-draft-row.command';
import {
  DraftRevisionCreateRowsCommandReturnType,
  DraftRevisionCreateTableCommandReturnType,
  DraftRevisionGetOrCreateDraftRowCommandReturnType,
} from 'src/features/draft-revision/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createDraftRevisionTestingModule,
  prepareDraftRevisionTest,
} from './utils';

describe('DraftRevisionGetOrCreateDraftRowHandler', () => {
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

  async function createTableAndRow(
    revisionId: string,
    tableId: string,
    rowId: string,
    data: object,
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
            rows: [{ rowId, data }],
          }),
        );
      return { tableResult, rowsResult };
    });
  }

  function runInTransaction(
    command: DraftRevisionGetOrCreateDraftRowCommand,
  ): Promise<DraftRevisionGetOrCreateDraftRowCommandReturnType> {
    return transactionService.run(() => commandBus.execute(command));
  }

  describe('validation', () => {
    it('should throw an error if row does not exist', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const { tableResult } = await createTableAndRow(
        draftRevisionId,
        'test-table',
        'existing-row',
        { test: 'value' },
      );

      const command = new DraftRevisionGetOrCreateDraftRowCommand({
        tableVersionId: tableResult.tableVersionId,
        rowId: 'non-existent-row',
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow('not found');
    });
  });

  describe('success cases', () => {
    it('should return existing row when not readonly', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const { tableResult, rowsResult } = await createTableAndRow(
        draftRevisionId,
        'test-table',
        'row-1',
        { test: 'value' },
      );

      const command = new DraftRevisionGetOrCreateDraftRowCommand({
        tableVersionId: tableResult.tableVersionId,
        rowId: 'row-1',
      });

      const result = await runInTransaction(command);

      expect(result.rowVersionId).toBe(rowsResult.createdRows[0].rowVersionId);
      expect(result.previousRowVersionId).toBe(
        rowsResult.createdRows[0].rowVersionId,
      );
      expect(result.rowCreatedId).toBe(rowsResult.createdRows[0].rowCreatedId);
      expect(result.wasCreated).toBe(false);
    });

    it('should create new row version when readonly', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const { tableResult, rowsResult } = await createTableAndRow(
        draftRevisionId,
        'test-table',
        'row-1',
        { test: 'value' },
      );

      await prismaService.row.update({
        where: { versionId: rowsResult.createdRows[0].rowVersionId },
        data: { readonly: true },
      });

      const command = new DraftRevisionGetOrCreateDraftRowCommand({
        tableVersionId: tableResult.tableVersionId,
        rowId: 'row-1',
      });

      const result = await runInTransaction(command);

      expect(result.rowVersionId).not.toBe(
        rowsResult.createdRows[0].rowVersionId,
      );
      expect(result.previousRowVersionId).toBe(
        rowsResult.createdRows[0].rowVersionId,
      );
      expect(result.rowCreatedId).toBe(rowsResult.createdRows[0].rowCreatedId);
      expect(result.wasCreated).toBe(true);

      const newRow = await prismaService.row.findUnique({
        where: { versionId: result.rowVersionId },
      });

      expect(newRow).not.toBeNull();
      expect(newRow?.readonly).toBe(false);
    });

    it('should preserve row data when creating new version', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const originalData = { field1: 'value1', field2: 123 };
      const { tableResult, rowsResult } = await createTableAndRow(
        draftRevisionId,
        'test-table',
        'row-1',
        originalData,
      );

      await prismaService.row.update({
        where: { versionId: rowsResult.createdRows[0].rowVersionId },
        data: { readonly: true },
      });

      const command = new DraftRevisionGetOrCreateDraftRowCommand({
        tableVersionId: tableResult.tableVersionId,
        rowId: 'row-1',
      });

      const result = await runInTransaction(command);

      const newRow = await prismaService.row.findUnique({
        where: { versionId: result.rowVersionId },
      });

      expect(newRow?.data).toEqual(originalData);
    });

    it('should disconnect previous row from table', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const { tableResult, rowsResult } = await createTableAndRow(
        draftRevisionId,
        'test-table',
        'row-1',
        { test: 'value' },
      );

      await prismaService.row.update({
        where: { versionId: rowsResult.createdRows[0].rowVersionId },
        data: { readonly: true },
      });

      const command = new DraftRevisionGetOrCreateDraftRowCommand({
        tableVersionId: tableResult.tableVersionId,
        rowId: 'row-1',
      });

      const result = await runInTransaction(command);

      const table = await prismaService.table.findUnique({
        where: { versionId: tableResult.tableVersionId },
        include: { rows: true },
      });

      expect(
        table?.rows.some(
          (r) => r.versionId === rowsResult.createdRows[0].rowVersionId,
        ),
      ).toBe(false);
      expect(table?.rows.some((r) => r.versionId === result.rowVersionId)).toBe(
        true,
      );
    });

    it('should preserve hash and schemaHash when creating new version', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const { tableResult, rowsResult } = await createTableAndRow(
        draftRevisionId,
        'test-table',
        'row-1',
        { test: 'value' },
      );

      const customSchemaHash = 'custom-schema-hash';
      await prismaService.row.update({
        where: { versionId: rowsResult.createdRows[0].rowVersionId },
        data: { readonly: true, schemaHash: customSchemaHash },
      });

      const command = new DraftRevisionGetOrCreateDraftRowCommand({
        tableVersionId: tableResult.tableVersionId,
        rowId: 'row-1',
      });

      const result = await runInTransaction(command);

      const originalRow = await prismaService.row.findUnique({
        where: { versionId: rowsResult.createdRows[0].rowVersionId },
      });
      const newRow = await prismaService.row.findUnique({
        where: { versionId: result.rowVersionId },
      });

      expect(newRow?.hash).toBe(originalRow?.hash);
      expect(newRow?.schemaHash).toBe(customSchemaHash);
    });

    it('should preserve meta when creating new version', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const { tableResult, rowsResult } = await createTableAndRow(
        draftRevisionId,
        'test-table',
        'row-1',
        { test: 'value' },
      );

      const customMeta = { previousValue: 1, patches: [] };
      await prismaService.row.update({
        where: { versionId: rowsResult.createdRows[0].rowVersionId },
        data: { readonly: true, meta: customMeta },
      });

      const command = new DraftRevisionGetOrCreateDraftRowCommand({
        tableVersionId: tableResult.tableVersionId,
        rowId: 'row-1',
      });

      const result = await runInTransaction(command);

      const newRow = await prismaService.row.findUnique({
        where: { versionId: result.rowVersionId },
      });

      expect(newRow?.meta).toEqual(customMeta);
    });

    it('should preserve publishedAt when creating new version', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const { tableResult, rowsResult } = await createTableAndRow(
        draftRevisionId,
        'test-table',
        'row-1',
        { test: 'value' },
      );

      const customPublishedAt = new Date('2025-06-15T12:00:00.000Z');
      await prismaService.row.update({
        where: { versionId: rowsResult.createdRows[0].rowVersionId },
        data: { readonly: true, publishedAt: customPublishedAt },
      });

      const command = new DraftRevisionGetOrCreateDraftRowCommand({
        tableVersionId: tableResult.tableVersionId,
        rowId: 'row-1',
      });

      const result = await runInTransaction(command);

      const newRow = await prismaService.row.findUnique({
        where: { versionId: result.rowVersionId },
      });

      expect(newRow?.publishedAt).toEqual(customPublishedAt);
    });
  });
});
