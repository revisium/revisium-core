import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { DraftRevisionCreateTableCommand } from 'src/features/draft-revision/commands/impl/draft-revision-create-table.command';
import { DraftRevisionCreateTableCommandReturnType } from 'src/features/draft-revision/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createDraftRevisionTestingModule,
  prepareDraftRevisionTest,
} from './utils';

describe('DraftRevisionCreateTableHandler', () => {
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

  function runInTransaction(
    command: DraftRevisionCreateTableCommand,
  ): Promise<DraftRevisionCreateTableCommandReturnType> {
    return transactionService.run(() => commandBus.execute(command));
  }

  describe('validation', () => {
    it('should throw an error if revision does not exist', async () => {
      const command = new DraftRevisionCreateTableCommand({
        revisionId: 'non-existent-revision-id',
        tableId: 'test-table',
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'Revision not found',
      );
    });

    it('should throw an error if revision is not draft', async () => {
      const { headRevisionId } = await prepareDraftRevisionTest(prismaService);

      const command = new DraftRevisionCreateTableCommand({
        revisionId: headRevisionId,
        tableId: 'test-table',
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'The revision is not a draft',
      );
    });

    it('should throw an error if tableId is empty', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);

      const command = new DraftRevisionCreateTableCommand({
        revisionId: draftRevisionId,
        tableId: '',
      });

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'Table ID must be 1 to 64 characters, start with a letter or underscore, and contain only letters (a-z, A-Z), digits (0-9), underscores (_), and hyphens (-).',
      );
    });

    it('should throw an error if table already exists', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);

      const command = new DraftRevisionCreateTableCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
      });

      await runInTransaction(command);

      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'A table with this name already exists in the revision',
      );
    });

    it('should throw an error if table already exists with different case', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);

      const createLowerCase = new DraftRevisionCreateTableCommand({
        revisionId: draftRevisionId,
        tableId: 'my-table',
      });

      await runInTransaction(createLowerCase);

      const createUpperCase = new DraftRevisionCreateTableCommand({
        revisionId: draftRevisionId,
        tableId: 'My-Table',
      });

      await expect(runInTransaction(createUpperCase)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(createUpperCase)).rejects.toThrow(
        'A table with this name already exists in the revision',
      );
    });
  });

  describe('success cases', () => {
    it('should create a table', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);

      const command = new DraftRevisionCreateTableCommand({
        revisionId: draftRevisionId,
        tableId: 'my-table',
      });

      const result = await runInTransaction(command);

      expect(result.tableVersionId).toBeDefined();
      expect(result.tableCreatedId).toBeDefined();
      expect(result.tableVersionId).not.toBe(result.tableCreatedId);

      const table = await prismaService.table.findUnique({
        where: { versionId: result.tableVersionId },
      });

      expect(table).not.toBeNull();
      expect(table?.id).toBe('my-table');
      expect(table?.createdId).toBe(result.tableCreatedId);
      expect(table?.readonly).toBe(false);
      expect(table?.system).toBe(false);
    });

    it('should create a system table', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);

      const command = new DraftRevisionCreateTableCommand({
        revisionId: draftRevisionId,
        tableId: '__system_table',
        system: true,
      });

      const result = await runInTransaction(command);

      const table = await prismaService.table.findUnique({
        where: { versionId: result.tableVersionId },
      });

      expect(table?.system).toBe(true);
    });

    it('should link table to revision', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);

      const command = new DraftRevisionCreateTableCommand({
        revisionId: draftRevisionId,
        tableId: 'linked-table',
      });

      const result = await runInTransaction(command);

      const revision = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        include: { tables: true },
      });

      const linkedTable = revision?.tables.find(
        (t) => t.versionId === result.tableVersionId,
      );

      expect(linkedTable).toBeDefined();
      expect(linkedTable?.id).toBe('linked-table');
    });

    it('should set hasChanges to true on revision', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);

      const revisionBefore = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        select: { hasChanges: true },
      });
      expect(revisionBefore?.hasChanges).toBe(false);

      const command = new DraftRevisionCreateTableCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
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
