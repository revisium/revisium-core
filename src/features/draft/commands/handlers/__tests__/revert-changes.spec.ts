import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  prepareProject,
  PrepareProjectReturnType,
} from 'src/__tests__/utils/prepareProject';
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
    const { organizationId, projectName, branchName, draftRevisionId } =
      await prepareProject(prismaService);
    await prismaService.revision.update({
      where: {
        id: draftRevisionId,
      },
      data: {
        hasChanges: false,
      },
    });

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
      await prepareProject(prismaService);

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
      await prepareProject(prismaService);

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
    const ids = await prepareProject(prismaService);
    const {
      organizationId,
      projectName,
      branchId,
      branchName,
      draftRevisionId,
    } = ids;
    await prepareRevision(ids);

    const command = new RevertChangesCommand({
      organizationId,
      projectName,
      branchName,
    });
    const result = await runTransaction(command);

    expect(result.branchId).toBe(branchId);
    expect(result.draftRevisionId).toBe(draftRevisionId);
    await checkRevisionTables(ids);
    await checkRevision(ids);
  });

  async function checkRevisionTables(ids: PrepareProjectReturnType) {
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

  async function prepareRevision(ids: PrepareProjectReturnType) {
    await prismaService.revision.update({
      where: { id: ids.draftRevisionId },
      data: { hasChanges: true },
    });
  }

  async function checkRevision(ids: PrepareProjectReturnType) {
    const { draftRevisionId } = ids;

    const revision = await prismaService.revision.findFirstOrThrow({
      where: { id: draftRevisionId },
    });
    expect(revision.hasChanges).toBe(false);
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
