import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { DraftRevisionCreateTableCommand } from 'src/features/draft-revision/commands/impl/draft-revision-create-table.command';
import { DraftRevisionGetOrCreateDraftTableCommand } from 'src/features/draft-revision/commands/impl/draft-revision-get-or-create-draft-table.command';
import {
  DraftRevisionCreateTableCommandReturnType,
  DraftRevisionGetOrCreateDraftTableCommandReturnType,
} from 'src/features/draft-revision/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createDraftRevisionTestingModule,
  prepareDraftRevisionTest,
} from './utils';

describe('DraftRevisionGetOrCreateDraftTableHandler', () => {
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
    options?: { system?: boolean },
  ): Promise<DraftRevisionCreateTableCommandReturnType> {
    return transactionService.run(() =>
      commandBus.execute(
        new DraftRevisionCreateTableCommand({
          revisionId,
          tableId,
          system: options?.system,
        }),
      ),
    );
  }

  function runInTransaction(
    command: DraftRevisionGetOrCreateDraftTableCommand,
  ): Promise<DraftRevisionGetOrCreateDraftTableCommandReturnType> {
    return transactionService.run(() => commandBus.execute(command));
  }

  describe('validation', () => {
    it('should throw an error if table does not exist', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);

      const command = new DraftRevisionGetOrCreateDraftTableCommand({
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
  });

  describe('success cases', () => {
    it('should return existing table when not readonly', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const tableResult = await createTable(draftRevisionId, 'test-table');

      const command = new DraftRevisionGetOrCreateDraftTableCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
      });

      const result = await runInTransaction(command);

      expect(result.tableVersionId).toBe(tableResult.tableVersionId);
      expect(result.previousTableVersionId).toBe(tableResult.tableVersionId);
      expect(result.tableCreatedId).toBe(tableResult.tableCreatedId);
      expect(result.wasCreated).toBe(false);
    });

    it('should create new table version when readonly', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const tableResult = await createTable(draftRevisionId, 'test-table');

      await prismaService.table.update({
        where: { versionId: tableResult.tableVersionId },
        data: { readonly: true },
      });

      const command = new DraftRevisionGetOrCreateDraftTableCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
      });

      const result = await runInTransaction(command);

      expect(result.tableVersionId).not.toBe(tableResult.tableVersionId);
      expect(result.previousTableVersionId).toBe(tableResult.tableVersionId);
      expect(result.tableCreatedId).toBe(tableResult.tableCreatedId);
      expect(result.wasCreated).toBe(true);

      const newTable = await prismaService.table.findUnique({
        where: { versionId: result.tableVersionId },
      });

      expect(newTable).not.toBeNull();
      expect(newTable?.readonly).toBe(false);
    });

    it('should preserve system flag when creating new version', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const tableResult = await createTable(draftRevisionId, 'system-table', {
        system: true,
      });

      await prismaService.table.update({
        where: { versionId: tableResult.tableVersionId },
        data: { readonly: true },
      });

      const command = new DraftRevisionGetOrCreateDraftTableCommand({
        revisionId: draftRevisionId,
        tableId: 'system-table',
      });

      const result = await runInTransaction(command);

      const newTable = await prismaService.table.findUnique({
        where: { versionId: result.tableVersionId },
      });

      expect(newTable?.system).toBe(true);
    });

    it('should disconnect previous table from revision', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);
      const tableResult = await createTable(draftRevisionId, 'test-table');

      await prismaService.table.update({
        where: { versionId: tableResult.tableVersionId },
        data: { readonly: true },
      });

      const command = new DraftRevisionGetOrCreateDraftTableCommand({
        revisionId: draftRevisionId,
        tableId: 'test-table',
      });

      const result = await runInTransaction(command);

      const revision = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        include: { tables: true },
      });

      expect(
        revision?.tables.some(
          (t) => t.versionId === tableResult.tableVersionId,
        ),
      ).toBe(false);
      expect(
        revision?.tables.some((t) => t.versionId === result.tableVersionId),
      ).toBe(true);
    });
  });
});
