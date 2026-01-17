import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  createChildBranch,
  createTestingModule,
  prepareProjectWithBranches,
} from 'src/features/branch/commands/handlers/__tests__/utils';
import { CreateBranchByRevisionIdCommand } from 'src/features/branch/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('CreateBranchByRevisionIdHandler', () => {
  let prismaService: PrismaService;
  let commandBus: CommandBus;

  function execute(command: CreateBranchByRevisionIdCommand): Promise<string> {
    return commandBus.execute(command);
  }

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });

  describe('validation', () => {
    it('should throw an error if branch already exists', async () => {
      const { rootHeadRevisionId, childBranchName } =
        await prepareProjectWithBranches(prismaService);

      const command = new CreateBranchByRevisionIdCommand({
        revisionId: rootHeadRevisionId,
        branchName: childBranchName,
      });

      await expect(execute(command)).rejects.toThrow(BadRequestException);
      await expect(execute(command)).rejects.toThrow(
        `Branch with name ${childBranchName} already exists`,
      );
    });

    it('should throw an error if branch already exists with different case', async () => {
      const { projectId, rootHeadRevisionId } =
        await prepareProjectWithBranches(prismaService);

      await createChildBranch(
        prismaService,
        projectId,
        rootHeadRevisionId,
        'feature-branch',
      );

      const command = new CreateBranchByRevisionIdCommand({
        revisionId: rootHeadRevisionId,
        branchName: 'Feature-Branch',
      });

      await expect(execute(command)).rejects.toThrow(BadRequestException);
      await expect(execute(command)).rejects.toThrow(
        'Branch with name Feature-Branch already exists',
      );
    });

    it('should throw an error if revision is a draft', async () => {
      const { rootDraftRevisionId } =
        await prepareProjectWithBranches(prismaService);

      const command = new CreateBranchByRevisionIdCommand({
        revisionId: rootDraftRevisionId,
        branchName: 'new-branch',
      });

      await expect(execute(command)).rejects.toThrow(BadRequestException);
      await expect(execute(command)).rejects.toThrow(
        'This revision is a draft revision',
      );
    });
  });

  describe('success cases', () => {
    it('should create a branch from head revision', async () => {
      const { projectId, rootHeadRevisionId } =
        await prepareProjectWithBranches(prismaService);

      const branchName = `new-branch-${Date.now()}`;

      const command = new CreateBranchByRevisionIdCommand({
        revisionId: rootHeadRevisionId,
        branchName,
      });

      const branchId = await execute(command);

      expect(branchId).toBeDefined();

      const branch = await prismaService.branch.findUnique({
        where: { id: branchId },
      });

      expect(branch).not.toBeNull();
      expect(branch?.name).toBe(branchName);
      expect(branch?.projectId).toBe(projectId);
      expect(branch?.isRoot).toBe(false);
    });
  });
});
