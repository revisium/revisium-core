import { CommandBus } from '@nestjs/cqrs';
import {
  prepareProject,
  PrepareProjectReturnType,
} from 'src/__tests__/utils/prepareProject';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { RevertChangesCommand } from 'src/features/draft/commands/impl/revert-changes.command';
import { RevertChangesHandlerReturnType } from 'src/features/draft/commands/types/revert-changes.handler.types';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

describe('RevertChangesHandler', () => {
  it('should throw an error if the project does not exist in the organization', async () => {
    const { organizationId, projectName, branchName } =
      await prepareProject(prismaService);

    jest
      .spyOn(shareTransactionalQueries, 'findProjectInOrganizationOrThrow')
      .mockRejectedValue(new Error('Project not found'));

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

    jest
      .spyOn(shareTransactionalQueries, 'findBranchInProjectOrThrow')
      .mockRejectedValue(new Error('Branch not found'));

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
  });

  async function prepareRevision(ids: PrepareProjectReturnType) {
    await prismaService.revision.update({
      where: { id: ids.draftRevisionId },
      data: { hasChanges: true },
    });
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

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
    shareTransactionalQueries = result.shareTransactionalQueries;
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
