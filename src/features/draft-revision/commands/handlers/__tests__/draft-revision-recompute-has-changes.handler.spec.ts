import { CommandBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { DraftRevisionRecomputeHasChangesCommand } from 'src/features/draft-revision/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createDraftRevisionTestingModule,
  prepareDraftRevisionTest,
} from 'src/features/draft-revision/commands/handlers/__tests__/utils';

describe('DraftRevisionRecomputeHasChangesHandler', () => {
  describe('revert table', () => {
    it('should revert table to head when no row changes remain', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);

      const tableId = 'test-table';
      const tableVersionId = nanoid();
      const rowVersionId = nanoid();

      await prismaService.table.create({
        data: {
          id: tableId,
          versionId: tableVersionId,
          createdId: nanoid(),
          system: false,
          readonly: false,
          revisions: {
            connect: { id: draftRevisionId },
          },
          rows: {
            create: {
              id: 'row-1',
              versionId: rowVersionId,
              createdId: nanoid(),
              data: { test: 'value' },
              hash: 'hash',
              schemaHash: 'schemaHash',
              readonly: false,
            },
          },
        },
      });

      await prismaService.revision.update({
        where: { id: draftRevisionId },
        data: { hasChanges: true },
      });

      await prismaService.row.delete({
        where: { versionId: rowVersionId },
      });

      const command = new DraftRevisionRecomputeHasChangesCommand({
        revisionId: draftRevisionId,
        tableId,
      });

      await runInTransaction(command);

      const tableInDraft = await prismaService.table.findFirst({
        where: {
          id: tableId,
          revisions: { some: { id: draftRevisionId } },
        },
      });
      expect(tableInDraft).toBeNull();

      const revision = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        select: { hasChanges: true },
      });
      expect(revision?.hasChanges).toBe(false);
    });

    it('should connect to head table version when reverting', async () => {
      const { draftRevisionId, headRevisionId } =
        await prepareDraftRevisionTest(prismaService);

      const tableId = 'test-table';
      const headTableVersionId = nanoid();
      const draftTableVersionId = nanoid();

      await prismaService.table.create({
        data: {
          id: tableId,
          versionId: headTableVersionId,
          createdId: nanoid(),
          system: false,
          readonly: true,
          revisions: {
            connect: [{ id: headRevisionId }, { id: draftRevisionId }],
          },
          rows: {
            create: {
              id: 'row-1',
              versionId: nanoid(),
              createdId: nanoid(),
              data: { test: 'value' },
              hash: 'hash',
              schemaHash: 'schemaHash',
              readonly: true,
            },
          },
        },
      });

      const draftRowVersionId = nanoid();
      await prismaService.table.create({
        data: {
          id: tableId,
          versionId: draftTableVersionId,
          createdId: nanoid(),
          system: false,
          readonly: false,
          revisions: {
            connect: { id: draftRevisionId },
          },
          rows: {
            create: {
              id: 'row-2',
              versionId: draftRowVersionId,
              createdId: nanoid(),
              data: { test: 'new-value' },
              hash: 'hash2',
              schemaHash: 'schemaHash',
              readonly: false,
            },
          },
        },
      });

      await prismaService.revision.update({
        where: { id: draftRevisionId },
        data: {
          hasChanges: true,
          tables: { disconnect: { versionId: headTableVersionId } },
        },
      });

      await prismaService.row.delete({
        where: { versionId: draftRowVersionId },
      });

      const command = new DraftRevisionRecomputeHasChangesCommand({
        revisionId: draftRevisionId,
        tableId,
      });

      await runInTransaction(command);

      const tableInDraft = await prismaService.table.findFirst({
        where: {
          id: tableId,
          revisions: { some: { id: draftRevisionId } },
        },
      });
      expect(tableInDraft?.versionId).toBe(headTableVersionId);

      const revision = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        select: { hasChanges: true },
      });
      expect(revision?.hasChanges).toBe(false);
    });

    it('should not revert table when row changes remain', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);

      const tableId = 'test-table';
      const tableVersionId = nanoid();

      await prismaService.table.create({
        data: {
          id: tableId,
          versionId: tableVersionId,
          createdId: nanoid(),
          system: false,
          readonly: false,
          revisions: {
            connect: { id: draftRevisionId },
          },
          rows: {
            create: {
              id: 'row-1',
              versionId: nanoid(),
              createdId: nanoid(),
              data: { test: 'value' },
              hash: 'hash',
              schemaHash: 'schemaHash',
              readonly: false,
            },
          },
        },
      });

      await prismaService.revision.update({
        where: { id: draftRevisionId },
        data: { hasChanges: true },
      });

      const command = new DraftRevisionRecomputeHasChangesCommand({
        revisionId: draftRevisionId,
        tableId,
      });

      await runInTransaction(command);

      const tableInDraft = await prismaService.table.findFirst({
        where: {
          id: tableId,
          revisions: { some: { id: draftRevisionId } },
        },
      });
      expect(tableInDraft?.versionId).toBe(tableVersionId);

      const revision = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        select: { hasChanges: true },
      });
      expect(revision?.hasChanges).toBe(true);
    });
  });

  describe('hasChanges computation', () => {
    it('should set hasChanges to false when no table diffs', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);

      await prismaService.revision.update({
        where: { id: draftRevisionId },
        data: { hasChanges: true },
      });

      const command = new DraftRevisionRecomputeHasChangesCommand({
        revisionId: draftRevisionId,
        tableId: 'non-existent-table',
      });

      await runInTransaction(command);

      const revision = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        select: { hasChanges: true },
      });
      expect(revision?.hasChanges).toBe(false);
    });

    it('should keep hasChanges true when other tables have changes', async () => {
      const { draftRevisionId } = await prepareDraftRevisionTest(prismaService);

      await prismaService.table.create({
        data: {
          id: 'other-table',
          versionId: nanoid(),
          createdId: nanoid(),
          system: false,
          readonly: false,
          revisions: {
            connect: { id: draftRevisionId },
          },
          rows: {
            create: {
              id: 'other-row',
              versionId: nanoid(),
              createdId: nanoid(),
              data: { test: 'value' },
              hash: 'hash',
              schemaHash: 'schemaHash',
              readonly: false,
            },
          },
        },
      });

      await prismaService.revision.update({
        where: { id: draftRevisionId },
        data: { hasChanges: true },
      });

      const command = new DraftRevisionRecomputeHasChangesCommand({
        revisionId: draftRevisionId,
        tableId: 'non-existent-table',
      });

      await runInTransaction(command);

      const revision = await prismaService.revision.findUnique({
        where: { id: draftRevisionId },
        select: { hasChanges: true },
      });
      expect(revision?.hasChanges).toBe(true);
    });
  });

  async function runInTransaction(
    command: DraftRevisionRecomputeHasChangesCommand,
  ): Promise<void> {
    return transactionService.run(async () => commandBus.execute(command));
  }

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
});
