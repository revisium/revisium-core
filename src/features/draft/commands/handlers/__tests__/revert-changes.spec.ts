import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {prepareBranch, PrepareBranchReturnType} from "src/__tests__/utils/prepareBranch";
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createMock,
  createTestingModule,

} from 'src/features/draft/commands/handlers/__tests__/utils';
import { RevertChangesCommand } from 'src/features/draft/commands/impl/revert-changes.command';
import { RevertChangesHandlerReturnType } from 'src/features/draft/commands/types/revert-changes.handler.types';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

describe('RevertChangesHandler', () => {
  it('should throw an error if there are no changes', async () => {
    const { organizationId, projectName, branchName } =
      await prepareBranch(prismaService);

    const command = new RevertChangesCommand({
      organizationId,
      projectName,
      branchName,
    });

    await expect(runTransaction(command)).rejects.toThrow(BadRequestException);
    await expect(runTransaction(command)).rejects.toThrow(
      'There are no changes',
    );
  });

  it('should throw an error if the project does not exist in the organization', async () => {
    const { organizationId, projectName, branchName } =
      await prepareBranch(prismaService);

    shareTransactionalQueries.findProjectInOrganizationOrThrow = createMock(
      new Error('Project not found'),
    );

    const command = new RevertChangesCommand({
      organizationId,
      projectName,
      branchName,
    });

    await expect(runTransaction(command)).rejects.toThrow('Project not found');
  });

  it('should throw an error if the branch does not exist in the project', async () => {
    const { organizationId, projectName, branchName } =
      await prepareBranch(prismaService);

    shareTransactionalQueries.findBranchInProjectOrThrow = createMock(
      new Error('Branch not found'),
    );

    const command = new RevertChangesCommand({
      organizationId,
      projectName,
      branchName,
    });

    await expect(runTransaction(command)).rejects.toThrow('Branch not found');
  });

  it('should revert changes if there are changes', async () => {
    const ids = await prepareBranch(prismaService);
    const {
      organizationId,
      projectName,
      branchId,
      branchName,
      draftRevisionId,
      draftChangelogId,
    } = ids;
    await prepareChangelog(draftChangelogId);

    const command = new RevertChangesCommand({
      organizationId,
      projectName,
      branchName,
    });
    const result = await runTransaction(command);

    expect(result.branchId).toBe(branchId);
    expect(result.draftRevisionId).toBe(draftRevisionId);
    await checkRevisions(ids);
    await checkChangelog(draftChangelogId);
  });

  async function checkRevisions(ids: PrepareBranchReturnType) {
    const { headTableVersionId, draftRevisionId } = ids;

    const draftRevisionTables = await prismaService.revision
      .findUniqueOrThrow({
        where: { id: draftRevisionId },
      })
      .tables({ select: { versionId: true } });

    expect(draftRevisionTables).toEqual(
      expect.arrayContaining([{ versionId: headTableVersionId }]),
    );
  }

  async function prepareChangelog(draftChangelogId: string) {
    await prismaService.changelog.update({
      where: {
        id: draftChangelogId,
      },
      data: {
        hasChanges: true,
        tableInsertsCount: 10,
        rowInsertsCount: 10,
        tableUpdatesCount: 10,
        rowUpdatesCount: 10,
        tableDeletesCount: 10,
        rowDeletesCount: 10,
        tableInserts: { test: {} },
        tableUpdates: { test: {} },
        tableDeletes: { test: {} },
        rowInserts: { test: {} },
        rowUpdates: { test: {} },
        rowDeletes: { test: {} },
      },
    });
  }

  async function checkChangelog(draftChangelogId: string) {
    const changelog = await prismaService.changelog.findUniqueOrThrow({
      where: { id: draftChangelogId },
    });

    expect(changelog.hasChanges).toBeFalsy();
    expect(changelog.tableInsertsCount).toBe(0);
    expect(changelog.rowInsertsCount).toBe(0);
    expect(changelog.tableUpdatesCount).toBe(0);
    expect(changelog.rowUpdatesCount).toBe(0);
    expect(changelog.tableDeletesCount).toBe(0);
    expect(changelog.rowDeletesCount).toBe(0);

    expect(changelog.tableInserts).toStrictEqual({});
    expect(changelog.rowInserts).toStrictEqual({});
    expect(changelog.tableUpdates).toStrictEqual({});
    expect(changelog.rowUpdates).toStrictEqual({});
    expect(changelog.tableDeletes).toStrictEqual({});
    expect(changelog.rowDeletes).toStrictEqual({});
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;
  let shareTransactionalQueries: ShareTransactionalQueries;

  function runTransaction(
    command: RevertChangesCommand,
  ): Promise<RevertChangesHandlerReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  beforeEach(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
    shareTransactionalQueries = result.shareTransactionalQueries;
  });

  afterEach(async () => {
    prismaService.$disconnect();
  });
});
