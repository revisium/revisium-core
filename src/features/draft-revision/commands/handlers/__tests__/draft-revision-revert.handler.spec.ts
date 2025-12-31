import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { DraftRevisionCreateTableCommand } from 'src/features/draft-revision/commands/impl/draft-revision-create-table.command';
import { DraftRevisionRevertCommand } from 'src/features/draft-revision/commands/impl/draft-revision-revert.command';
import { DraftRevisionRevertCommandReturnType } from 'src/features/draft-revision/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createDraftRevisionTestingModule,
  prepareDraftRevisionTest,
} from './utils';

describe('DraftRevisionRevertHandler', () => {
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
    command: DraftRevisionRevertCommand,
  ): Promise<DraftRevisionRevertCommandReturnType> {
    return transactionService.run(() => commandBus.execute(command));
  }

  async function createChange(draftRevisionId: string, tableId: string) {
    return transactionService.run(() =>
      commandBus.execute(
        new DraftRevisionCreateTableCommand({
          revisionId: draftRevisionId,
          tableId,
        }),
      ),
    );
  }

  async function setHasChanges(revisionId: string, hasChanges: boolean) {
    await prismaService.revision.update({
      where: { id: revisionId },
      data: { hasChanges },
    });
  }

  describe('validation', () => {
    it('should throw if branch has no head revision', async () => {
      const { branchId } = await prepareDraftRevisionTest(prismaService);
      await prismaService.revision.updateMany({
        where: { branchId },
        data: { isHead: false },
      });

      const command = new DraftRevisionRevertCommand({ branchId });
      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'Head revision not found',
      );
    });

    it('should throw if branch has no draft revision', async () => {
      const { branchId } = await prepareDraftRevisionTest(prismaService);
      await prismaService.revision.updateMany({
        where: { branchId },
        data: { isDraft: false },
      });

      const command = new DraftRevisionRevertCommand({ branchId });
      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'Draft revision not found',
      );
    });

    it('should throw if draft has no changes', async () => {
      const { branchId } = await prepareDraftRevisionTest(prismaService);

      const command = new DraftRevisionRevertCommand({ branchId });
      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'There are no changes',
      );
    });
  });

  describe('success cases', () => {
    it('should revert draft to head state', async () => {
      const { branchId, draftRevisionId } =
        await prepareDraftRevisionTest(prismaService);
      await createChange(draftRevisionId, 'test-table');
      await setHasChanges(draftRevisionId, true);

      const command = new DraftRevisionRevertCommand({ branchId });
      const result = await runInTransaction(command);

      expect(result.draftRevisionId).toBe(draftRevisionId);
    });

    it('should reset hasChanges flag', async () => {
      const { branchId, draftRevisionId } =
        await prepareDraftRevisionTest(prismaService);
      await createChange(draftRevisionId, 'test-table');
      await setHasChanges(draftRevisionId, true);

      const command = new DraftRevisionRevertCommand({ branchId });
      await runInTransaction(command);

      const draft = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
      });
      expect(draft?.hasChanges).toBe(false);
    });

    it('should reset draft tables to head tables', async () => {
      const { branchId, headRevisionId, draftRevisionId } =
        await prepareDraftRevisionTest(prismaService);
      await createChange(draftRevisionId, 'test-table');
      await setHasChanges(draftRevisionId, true);

      const headRevision = await prismaService.revision.findUnique({
        where: { id: headRevisionId },
        include: { tables: true },
      });
      const headTableIds = headRevision?.tables.map((t) => t.versionId) ?? [];

      const command = new DraftRevisionRevertCommand({ branchId });
      await runInTransaction(command);

      const draftRevision = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        include: { tables: true },
      });
      const draftTableIds = draftRevision?.tables.map((t) => t.versionId) ?? [];

      expect(draftTableIds).toEqual(headTableIds);
    });

    it('should disconnect draft-only tables', async () => {
      const { branchId, draftRevisionId } =
        await prepareDraftRevisionTest(prismaService);
      const tableResult = await createChange(draftRevisionId, 'test-table');
      await setHasChanges(draftRevisionId, true);

      const command = new DraftRevisionRevertCommand({ branchId });
      await runInTransaction(command);

      const draftRevision = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        include: { tables: true },
      });
      const tableIds = draftRevision?.tables.map((t) => t.versionId) ?? [];
      expect(tableIds).not.toContain(tableResult.tableVersionId);
    });
  });
});
