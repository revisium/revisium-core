import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { DraftRevisionCreateTableCommand } from 'src/features/draft-revision/commands/impl/draft-revision-create-table.command';
import { DraftRevisionRenameTableCommand } from 'src/features/draft-revision/commands/impl/draft-revision-rename-table.command';
import {
  DraftRevisionCreateTableCommandReturnType,
  DraftRevisionRenameTableCommandReturnType,
} from 'src/features/draft-revision/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createDraftRevisionTestingModule,
  prepareDraftRevisionTest,
} from './utils';

describe('DraftRevisionRenameTableHandler', () => {
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
    command: DraftRevisionRenameTableCommand,
  ): Promise<DraftRevisionRenameTableCommandReturnType> {
    return transactionService.run(() => commandBus.execute(command));
  }

  describe('validation', () => {
    it('should throw an error if revision is not a draft', async () => {
      const { headRevisionId } = await prepareDraftRevisionTest(prismaService);

      const command = new DraftRevisionRenameTableCommand({
        revisionId: headRevisionId,
        tableId: 'test-table',
        nextTableId: 'renamed-table',
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw an error if table does not exist', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);

      const command = new DraftRevisionRenameTableCommand({
        revisionId: draftRevisionId,
        tableId: 'non-existent-table',
        nextTableId: 'renamed-table',
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw an error if nextTableId is empty', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTable(draftRevisionId, 'test-table');

      const command = new DraftRevisionRenameTableCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        nextTableId: '',
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw an error if nextTableId already exists', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTable(draftRevisionId, 'table-one');
      await createTable(draftRevisionId, 'table-two');

      const command = new DraftRevisionRenameTableCommand({
        revisionId: draftRevisionId,
        tableId: 'table-one',
        nextTableId: 'table-two',
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw an error if tableId equals nextTableId', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTable(draftRevisionId, 'test-table');

      const command = new DraftRevisionRenameTableCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
        nextTableId: 'test-table',
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'New ID must be different from current',
      );
    });
  });

  describe('rename draft table', () => {
    it('should rename a draft table', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const createResult = await createTable(draftRevisionId, 'original-table');

      const command = new DraftRevisionRenameTableCommand({
        revisionId: draftRevisionId,
        tableId: 'original-table',
        nextTableId: 'renamed-table',
      });

      const result = await runInTransaction(command);

      expect(result.tableVersionId).toBe(createResult.tableVersionId);
      expect(result.previousTableVersionId).toBe(createResult.tableVersionId);

      const renamedTable = await prismaService.table.findUnique({
        where: { versionId: result.tableVersionId },
      });

      expect(renamedTable).not.toBeNull();
      expect(renamedTable?.id).toBe('renamed-table');
    });
  });

  describe('hasChanges', () => {
    it('should set hasChanges to true on revision', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      await createTable(draftRevisionId, 'original-table');
      await prismaService.revision.update({
        where: { id: draftRevisionId },
        data: { hasChanges: false },
      });

      const revisionBefore = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        select: { hasChanges: true },
      });
      expect(revisionBefore?.hasChanges).toBe(false);

      const command = new DraftRevisionRenameTableCommand({
        revisionId: draftRevisionId,
        tableId: 'original-table',
        nextTableId: 'renamed-table',
      });

      await runInTransaction(command);

      const revisionAfter = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        select: { hasChanges: true },
      });
      expect(revisionAfter?.hasChanges).toBe(true);
    });
  });

  describe('rename readonly table (copy-on-write)', () => {
    it('should create new table version when renaming readonly table', async () => {
      const { draftRevisionId, headRevisionId } =
        await prepareDraftRevisionTest(prismaService);
      const createResult = await createTable(draftRevisionId, 'shared-table');

      await prismaService.table.update({
        where: { versionId: createResult.tableVersionId },
        data: {
          readonly: true,
          revisions: {
            connect: { id: headRevisionId },
          },
        },
      });

      const command = new DraftRevisionRenameTableCommand({
        revisionId: draftRevisionId,
        tableId: 'shared-table',
        nextTableId: 'renamed-shared-table',
      });

      const result = await runInTransaction(command);

      expect(result.tableVersionId).not.toBe(createResult.tableVersionId);
      expect(result.previousTableVersionId).toBe(createResult.tableVersionId);

      const newTable = await prismaService.table.findUnique({
        where: { versionId: result.tableVersionId },
      });

      expect(newTable).not.toBeNull();
      expect(newTable?.id).toBe('renamed-shared-table');
      expect(newTable?.readonly).toBe(false);

      const oldTable = await prismaService.table.findUnique({
        where: { versionId: createResult.tableVersionId },
      });

      expect(oldTable).not.toBeNull();
      expect(oldTable?.id).toBe('shared-table');
    });
  });
});
