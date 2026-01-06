import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import objectHash from 'object-hash';
import { DraftRevisionCreateRowsCommand } from 'src/features/draft-revision/commands/impl/draft-revision-create-rows.command';
import { DraftRevisionCreateTableCommand } from 'src/features/draft-revision/commands/impl/draft-revision-create-table.command';
import {
  DraftRevisionCreateRowsCommandReturnType,
  DraftRevisionCreateTableCommandReturnType,
} from 'src/features/draft-revision/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createDraftRevisionTestingModule,
  prepareDraftRevisionTest,
} from './utils';

describe('DraftRevisionCreateRowsHandler', () => {
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

  function runInTransaction(
    command: DraftRevisionCreateRowsCommand,
  ): Promise<DraftRevisionCreateRowsCommandReturnType> {
    return transactionService.run(() => commandBus.execute(command));
  }

  describe('validation', () => {
    it('should throw an error if revision is not draft', async () => {
      const { headRevisionId } = await prepareDraftRevisionTest(prismaService);

      const command = new DraftRevisionCreateRowsCommand({
        revisionId: headRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: 'row-1', data: { field: 'value' } }],
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
      await createTable(draftRevisionId, 'test-table');

      const command = new DraftRevisionCreateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: '', data: { field: 'value' } }],
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'Row ID must be 1 to 64 characters and contain only letters (a-z, A-Z), digits (0-9), underscores (_), and hyphens (-).',
      );
    });

    it('should throw an error if duplicate rowIds in request', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTable(draftRevisionId, 'test-table');

      const command = new DraftRevisionCreateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [
          { rowId: 'row-1', data: { field: 'value1' } },
          { rowId: 'row-1', data: { field: 'value2' } },
        ],
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'Duplicate row IDs in request',
      );
    });

    it('should throw an error if row already exists', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTable(draftRevisionId, 'test-table');

      const createCommand = new DraftRevisionCreateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: 'row-1', data: { field: 'value' } }],
      });

      await runInTransaction(createCommand);

      const command = new DraftRevisionCreateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: 'row-1', data: { field: 'value2' } }],
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'Rows already exist: row-1',
      );
    });

    it('should throw an error if any of rows already exists', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTable(draftRevisionId, 'test-table');

      const createCommand = new DraftRevisionCreateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: 'row-1', data: { field: 'value' } }],
      });

      await runInTransaction(createCommand);

      const command = new DraftRevisionCreateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [
          { rowId: 'row-1', data: { field: 'value2' } },
          { rowId: 'row-2', data: { field: 'value3' } },
        ],
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'Rows already exist: row-1',
      );
    });

    it('should throw an error if table does not exist', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);

      const command = new DraftRevisionCreateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'non-existent-table',
        rows: [{ rowId: 'row-1', data: { field: 'value' } }],
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
    it('should create multiple rows and calculate hashes', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTable(draftRevisionId, 'test-table');

      const rowData1 = { field: 'value1', number: 1 };
      const rowData2 = { field: 'value2', number: 2 };
      const command = new DraftRevisionCreateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [
          { rowId: 'row-1', data: rowData1 },
          { rowId: 'row-2', data: rowData2 },
        ],
      });

      const result = await runInTransaction(command);

      expect(result.createdRows).toHaveLength(2);
      expect(result.tableVersionId).toBeDefined();
      expect(result.tableCreatedId).toBeDefined();

      const row1 = await prismaService.row.findUnique({
        where: { versionId: result.createdRows[0].rowVersionId },
      });

      expect(row1).not.toBeNull();
      expect(row1?.id).toBe('row-1');
      expect(row1?.data).toEqual(rowData1);
      expect(row1?.hash).toBe(objectHash(rowData1));

      const row2 = await prismaService.row.findUnique({
        where: { versionId: result.createdRows[1].rowVersionId },
      });

      expect(row2).not.toBeNull();
      expect(row2?.id).toBe('row-2');
      expect(row2?.data).toEqual(rowData2);
      expect(row2?.hash).toBe(objectHash(rowData2));
    });

    it('should create single row (array of one element)', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTable(draftRevisionId, 'test-table');

      const rowData = { field: 'value', number: 42 };
      const command = new DraftRevisionCreateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: 'single-row', data: rowData }],
      });

      const result = await runInTransaction(command);

      expect(result.createdRows).toHaveLength(1);
      expect(result.createdRows[0].rowVersionId).toBeDefined();
      expect(result.createdRows[0].rowCreatedId).toBeDefined();

      const row = await prismaService.row.findUnique({
        where: { versionId: result.createdRows[0].rowVersionId },
      });

      expect(row).not.toBeNull();
      expect(row?.id).toBe('single-row');
      expect(row?.data).toEqual(rowData);
    });

    it('should store schemaHash if provided', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTable(draftRevisionId, 'test-table');

      const schemaHash = 'schema-hash-123';
      const command = new DraftRevisionCreateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [
          { rowId: 'row-with-schema', data: { test: 'value' }, schemaHash },
        ],
      });

      const result = await runInTransaction(command);

      const row = await prismaService.row.findUnique({
        where: { versionId: result.createdRows[0].rowVersionId },
      });

      expect(row?.schemaHash).toBe(schemaHash);
    });

    it('should store meta if provided', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTable(draftRevisionId, 'test-table');

      const meta = { version: 1, patches: [] };
      const command = new DraftRevisionCreateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: 'row-with-meta', data: { test: 'value' }, meta }],
      });

      const result = await runInTransaction(command);

      const row = await prismaService.row.findUnique({
        where: { versionId: result.createdRows[0].rowVersionId },
      });

      expect(row?.meta).toEqual(meta);
    });

    it('should link all rows to table', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const tableResult = await createTable(draftRevisionId, 'test-table');

      const command = new DraftRevisionCreateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [
          { rowId: 'linked-row-1', data: { test: 'value1' } },
          { rowId: 'linked-row-2', data: { test: 'value2' } },
        ],
      });

      const result = await runInTransaction(command);

      const table = await prismaService.table.findUnique({
        where: { versionId: tableResult.tableVersionId },
        include: { rows: true },
      });

      expect(table?.rows).toHaveLength(2);
      expect(
        table?.rows.some(
          (r) => r.versionId === result.createdRows[0].rowVersionId,
        ),
      ).toBe(true);
      expect(
        table?.rows.some(
          (r) => r.versionId === result.createdRows[1].rowVersionId,
        ),
      ).toBe(true);
    });

    it('should store publishedAt if provided', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTable(draftRevisionId, 'test-table');

      const publishedAtDate = new Date('2027-01-01T00:00:00.000Z');
      const command = new DraftRevisionCreateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [
          {
            rowId: 'row-with-published-at',
            data: { test: 'value' },
            publishedAt: publishedAtDate,
          },
        ],
      });

      const result = await runInTransaction(command);

      const row = await prismaService.row.findUnique({
        where: { versionId: result.createdRows[0].rowVersionId },
      });

      expect(row?.publishedAt).toEqual(publishedAtDate);
    });
  });

  describe('hasChanges', () => {
    it('should set hasChanges to true on revision', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTable(draftRevisionId, 'test-table');
      await prismaService.revision.update({
        where: { id: draftRevisionId },
        data: { hasChanges: false },
      });

      const revisionBefore = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        select: { hasChanges: true },
      });
      expect(revisionBefore?.hasChanges).toBe(false);

      const command = new DraftRevisionCreateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: 'row-1', data: { field: 'value' } }],
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
    it('should create new table version when table is readonly', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const tableResult = await createTable(draftRevisionId, 'test-table');

      await prismaService.table.update({
        where: { versionId: tableResult.tableVersionId },
        data: { readonly: true },
      });

      const command = new DraftRevisionCreateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: 'new-row', data: { test: 'value' } }],
      });

      const result = await runInTransaction(command);

      expect(result.tableVersionId).not.toBe(tableResult.tableVersionId);
      expect(result.previousTableVersionId).toBe(tableResult.tableVersionId);
    });

    it('should reuse table version when table is not readonly', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const tableResult = await createTable(draftRevisionId, 'test-table');

      const command = new DraftRevisionCreateRowsCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        rows: [{ rowId: 'new-row', data: { test: 'value' } }],
      });

      const result = await runInTransaction(command);

      expect(result.tableVersionId).toBe(tableResult.tableVersionId);
      expect(result.previousTableVersionId).toBe(tableResult.tableVersionId);
    });
  });
});
