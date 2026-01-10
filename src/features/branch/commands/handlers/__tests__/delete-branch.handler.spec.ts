import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  createTestingModule,
  prepareProjectWithBranches,
} from 'src/features/branch/commands/handlers/__tests__/utils';
import {
  DeleteBranchCommand,
  DeleteBranchCommandReturnType,
} from 'src/features/branch/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

describe('DeleteBranchHandler', () => {
  it('should delete non-root branch', async () => {
    const {
      organizationId,
      projectName,
      childBranchId,
      childBranchName,
      childHeadEndpointId,
      childDraftEndpointId,
    } = await prepareProjectWithBranches(prismaService);

    const command = new DeleteBranchCommand({
      organizationId,
      projectName,
      branchName: childBranchName,
    });

    const result = await execute(command);

    expect(result).toBe(true);

    const branch = await prismaService.branch.findUnique({
      where: { id: childBranchId },
    });
    expect(branch).toBeNull();

    const headEndpoint = await prismaService.endpoint.findUnique({
      where: { id: childHeadEndpointId },
    });
    expect(headEndpoint).toBeNull();

    const draftEndpoint = await prismaService.endpoint.findUnique({
      where: { id: childDraftEndpointId },
    });
    expect(draftEndpoint).toBeNull();
  });

  it('should notify endpoints about deletion', async () => {
    const {
      organizationId,
      projectName,
      childBranchName,
      childHeadEndpointId,
      childDraftEndpointId,
    } = await prepareProjectWithBranches(prismaService);

    const command = new DeleteBranchCommand({
      organizationId,
      projectName,
      branchName: childBranchName,
    });

    await execute(command);

    expect(endpointNotificationService.delete).toHaveBeenCalledTimes(2);
    expect(endpointNotificationService.delete).toHaveBeenCalledWith(
      childHeadEndpointId,
    );
    expect(endpointNotificationService.delete).toHaveBeenCalledWith(
      childDraftEndpointId,
    );
  });

  it('should fail to delete root branch', async () => {
    const { organizationId, projectName, rootBranchName } =
      await prepareProjectWithBranches(prismaService);

    const command = new DeleteBranchCommand({
      organizationId,
      projectName,
      branchName: rootBranchName,
    });

    await expect(execute(command)).rejects.toThrow(BadRequestException);
    await expect(execute(command)).rejects.toThrow(
      'Cannot delete the root branch',
    );
  });

  it('should not affect other branches', async () => {
    const { organizationId, projectName, rootBranchId, childBranchName } =
      await prepareProjectWithBranches(prismaService);

    const command = new DeleteBranchCommand({
      organizationId,
      projectName,
      branchName: childBranchName,
    });

    await execute(command);

    const rootBranch = await prismaService.branch.findUnique({
      where: { id: rootBranchId },
    });
    expect(rootBranch).not.toBeNull();
  });

  it('should cascade delete revisions', async () => {
    const {
      organizationId,
      projectName,
      childBranchName,
      childHeadRevisionId,
      childDraftRevisionId,
    } = await prepareProjectWithBranches(prismaService);

    const command = new DeleteBranchCommand({
      organizationId,
      projectName,
      branchName: childBranchName,
    });

    await execute(command);

    const headRevision = await prismaService.revision.findUnique({
      where: { id: childHeadRevisionId },
    });
    expect(headRevision).toBeNull();

    const draftRevision = await prismaService.revision.findUnique({
      where: { id: childDraftRevisionId },
    });
    expect(draftRevision).toBeNull();
  });

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let endpointNotificationService: EndpointNotificationService;

  function execute(
    command: DeleteBranchCommand,
  ): Promise<DeleteBranchCommandReturnType> {
    return commandBus.execute(command);
  }

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    endpointNotificationService = result.endpointNotificationService;
  });

  beforeEach(() => {
    endpointNotificationService.delete = jest.fn();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
