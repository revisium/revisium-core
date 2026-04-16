import { BadRequestException } from '@nestjs/common';
import { DraftRevisionCommitCommand } from 'src/features/draft-revision/commands/impl/draft-revision-commit.command';
import { DraftRevisionCreateTableCommand } from 'src/features/draft-revision/commands/impl/draft-revision-create-table.command';
import {
  DraftRevisionCommitCommandReturnType,
  DraftRevisionCreateTableCommandReturnType,
} from 'src/features/draft-revision/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  createDraftRevisionCommandTestKit,
  type DraftRevisionCommandTestKit,
} from 'src/testing/kit/create-draft-revision-command-test-kit';
import { givenDraftRevision } from 'src/testing/scenarios/given-draft-revision';

describe('DraftRevisionCommitHandler', () => {
  let kit: DraftRevisionCommandTestKit;
  let prismaService: PrismaService;

  beforeAll(async () => {
    kit = await createDraftRevisionCommandTestKit();
    prismaService = kit.prismaService;
  });

  afterAll(async () => {
    await kit.close();
  });

  function runInTransaction(
    command: DraftRevisionCommitCommand,
  ): Promise<DraftRevisionCommitCommandReturnType> {
    return kit.executeSerializable(command);
  }

  async function createChange(
    draftRevisionId: string,
    tableId: string,
  ): Promise<DraftRevisionCreateTableCommandReturnType> {
    return kit.executeSerializable(
      new DraftRevisionCreateTableCommand({
        revisionId: draftRevisionId,
        tableId,
      }),
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
      const { branchId } = await givenDraftRevision(prismaService);
      await prismaService.revision.updateMany({
        where: { branchId },
        data: { isHead: false },
      });

      const command = new DraftRevisionCommitCommand({ branchId });
      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'Head revision not found',
      );
    });

    it('should throw if branch has no draft revision', async () => {
      const { branchId } = await givenDraftRevision(prismaService);
      await prismaService.revision.updateMany({
        where: { branchId },
        data: { isDraft: false },
      });

      const command = new DraftRevisionCommitCommand({ branchId });
      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'Draft revision not found',
      );
    });

    it('should throw if draft has no changes', async () => {
      const { branchId } = await givenDraftRevision(prismaService);

      const command = new DraftRevisionCommitCommand({ branchId });
      await expect(runInTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runInTransaction(command)).rejects.toThrow(
        'There are no changes',
      );
    });
  });

  describe('success cases', () => {
    it('should commit draft revision and create new draft', async () => {
      const { branchId, headRevisionId, draftRevisionId } =
        await givenDraftRevision(prismaService);
      await createChange(draftRevisionId, 'test-table');
      await setHasChanges(draftRevisionId, true);

      const command = new DraftRevisionCommitCommand({ branchId });
      const result = await runInTransaction(command);

      expect(result.previousHeadRevisionId).toBe(headRevisionId);
      expect(result.previousDraftRevisionId).toBe(draftRevisionId);
      expect(result.nextDraftRevisionId).toBeDefined();
      expect(result.nextDraftRevisionId).not.toBe(draftRevisionId);
    });

    it('should update revision flags correctly', async () => {
      const { branchId, headRevisionId, draftRevisionId } =
        await givenDraftRevision(prismaService);
      await createChange(draftRevisionId, 'test-table');
      await setHasChanges(draftRevisionId, true);

      const command = new DraftRevisionCommitCommand({ branchId });
      const result = await runInTransaction(command);

      const oldHead = await prismaService.revision.findUnique({
        where: { id: headRevisionId },
      });
      expect(oldHead?.isHead).toBe(false);
      expect(oldHead?.isDraft).toBe(false);

      const newHead = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
      });
      expect(newHead?.isHead).toBe(true);
      expect(newHead?.isDraft).toBe(false);
      expect(newHead?.hasChanges).toBe(false);

      const newDraft = await prismaService.revision.findUnique({
        where: { id: result.nextDraftRevisionId },
      });
      expect(newDraft?.isHead).toBe(false);
      expect(newDraft?.isDraft).toBe(true);
      expect(newDraft?.hasChanges).toBe(false);
      expect(newDraft?.parentId).toBe(draftRevisionId);
    });

    it('should lock tables and rows after commit', async () => {
      const { branchId, draftRevisionId } =
        await givenDraftRevision(prismaService);
      const tableResult = await createChange(draftRevisionId, 'test-table');
      await setHasChanges(draftRevisionId, true);

      const command = new DraftRevisionCommitCommand({ branchId });
      await runInTransaction(command);

      const table = await prismaService.table.findUnique({
        where: { versionId: tableResult.tableVersionId },
      });
      expect(table?.readonly).toBe(true);
    });

    it('should connect tables to new draft revision', async () => {
      const { branchId, draftRevisionId } =
        await givenDraftRevision(prismaService);
      const tableResult = await createChange(draftRevisionId, 'test-table');
      await setHasChanges(draftRevisionId, true);

      const command = new DraftRevisionCommitCommand({ branchId });
      const result = await runInTransaction(command);

      const newDraft = await prismaService.revision.findUnique({
        where: { id: result.nextDraftRevisionId },
        include: { tables: true },
      });
      expect(newDraft?.tables).toHaveLength(1);
      expect(newDraft?.tables[0].versionId).toBe(tableResult.tableVersionId);
    });

    it('should save comment when provided', async () => {
      const { branchId, draftRevisionId } =
        await givenDraftRevision(prismaService);
      await createChange(draftRevisionId, 'test-table');
      await setHasChanges(draftRevisionId, true);

      const comment = 'Added test table';
      const command = new DraftRevisionCommitCommand({ branchId, comment });
      await runInTransaction(command);

      const newHead = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
      });
      expect(newHead?.comment).toBe(comment);
    });

    it('should commit successfully when draft has no tables', async () => {
      const { branchId, draftRevisionId } =
        await givenDraftRevision(prismaService);
      await setHasChanges(draftRevisionId, true);

      const command = new DraftRevisionCommitCommand({ branchId });
      const result = await runInTransaction(command);

      expect(result.previousDraftRevisionId).toBe(draftRevisionId);
      expect(result.nextDraftRevisionId).toBeDefined();

      const newDraft = await prismaService.revision.findUnique({
        where: { id: result.nextDraftRevisionId },
        include: { tables: true },
      });
      expect(newDraft?.tables).toHaveLength(0);
    });
  });
});
