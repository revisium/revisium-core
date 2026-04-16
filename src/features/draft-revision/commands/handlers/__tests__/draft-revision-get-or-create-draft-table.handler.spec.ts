import { BadRequestException } from '@nestjs/common';
import { DraftRevisionCreateTableCommand } from 'src/features/draft-revision/commands/impl/draft-revision-create-table.command';
import { DraftRevisionGetOrCreateDraftTableCommand } from 'src/features/draft-revision/commands/impl/draft-revision-get-or-create-draft-table.command';
import {
  DraftRevisionCreateTableCommandReturnType,
  DraftRevisionGetOrCreateDraftTableCommandReturnType,
} from 'src/features/draft-revision/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  createDraftRevisionCommandTestKit,
  type DraftRevisionCommandTestKit,
} from 'src/testing/kit/create-draft-revision-command-test-kit';
import { givenDraftRevision } from 'src/testing/scenarios/given-draft-revision';

describe('DraftRevisionGetOrCreateDraftTableHandler', () => {
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
    options?: { system?: boolean },
  ): Promise<DraftRevisionCreateTableCommandReturnType> {
    return kit.executeSerializable(
      new DraftRevisionCreateTableCommand({
        revisionId,
        tableId,
        system: options?.system,
      }),
    );
  }

  function runInTransaction(
    command: DraftRevisionGetOrCreateDraftTableCommand,
  ): Promise<DraftRevisionGetOrCreateDraftTableCommandReturnType> {
    return kit.executeSerializable(command);
  }

  describe('validation', () => {
    it('should throw an error if table does not exist', async () => {
      const { draftRevisionId } = await givenDraftRevision(prismaService);

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
      const { draftRevisionId } = await givenDraftRevision(prismaService);
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
      const { draftRevisionId } = await givenDraftRevision(prismaService);
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
      const { draftRevisionId } = await givenDraftRevision(prismaService);
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
      const { draftRevisionId } = await givenDraftRevision(prismaService);
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
