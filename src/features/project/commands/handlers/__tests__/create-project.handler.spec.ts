import { CommandBus } from '@nestjs/cqrs';
import {
  prepareProject,
  createTestingModule,
} from 'src/features/project/commands/handlers/__tests__/utils';
import { DEFAULT_BRANCH_NAME } from 'src/features/project/commands/handlers/create-project.handler';
import {
  CreateProjectCommand,
  CreateProjectCommandReturnType,
} from 'src/features/project/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('CreateProjectHandler', () => {
  it('should create a new project', async () => {
    const { organizationId } = await prepareProject(prismaService);

    const newProjectName = 'newProject';

    const command = new CreateProjectCommand({
      organizationId,
      projectName: newProjectName,
      branchName: '',
    });

    const result = await execute(command);

    const project = await prismaService.project.findFirstOrThrow({
      where: {
        organizationId,
        name: newProjectName,
      },
      include: {
        branches: true,
      },
    });

    const branch = await prismaService.branch.findFirstOrThrow({
      where: {
        projectId: project.id,
      },
    });
    const tables = await prismaService.table.findMany({
      where: {
        revisions: {
          some: {
            branchId: branch.id,
          },
        },
      },
    });
    expect(result).toBe(project.id);
    expect(branch.name).toBe(DEFAULT_BRANCH_NAME);
    expect(tables.length).toBe(2); // schema table and shared schemas table
  });

  it('should create a new project with specified branch name', async () => {
    const { organizationId } = await prepareProject(prismaService);

    const newProjectName = 'newProject';
    const branchName = 'develop';

    const command = new CreateProjectCommand({
      organizationId,
      projectName: newProjectName,
      branchName,
    });

    const result = await execute(command);

    const branch = await prismaService.branch.findFirstOrThrow({
      where: {
        projectId: result,
      },
    });
    expect(branch.name).toBe(branchName);
  });

  it('should create a new project from revision', async () => {
    const {
      organizationId,
      headRevisionId,
      schemaTableVersionId,
      headTableVersionId,
    } = await prepareProject(prismaService);

    const newProjectName = 'newProject';

    const command = new CreateProjectCommand({
      organizationId,
      projectName: newProjectName,
      fromRevisionId: headRevisionId,
    });

    await execute(command);

    const project = await prismaService.project.findFirstOrThrow({
      where: {
        organizationId,
        name: newProjectName,
      },
    });

    const branch = await prismaService.branch.findFirstOrThrow({
      where: {
        projectId: project.id,
      },
    });
    const tables = await prismaService.table.findMany({
      where: {
        revisions: {
          some: {
            branchId: branch.id,
          },
        },
      },
    });
    expect(tables.length).toBe(2);
    expect(tables.some((table) => table.versionId === headTableVersionId)).toBe(
      true,
    );
    expect(
      tables.some((table) => table.versionId === schemaTableVersionId),
    ).toBe(true);
  });

  it('should create a new project with name that was previously used by a deleted project', async () => {
    const { organizationId } = await prepareProject(prismaService);
    const projectName = 'reusedProjectName';

    const initialCommand = new CreateProjectCommand({
      organizationId,
      projectName,
    });

    const initialProjectId = await execute(initialCommand);

    await prismaService.project.update({
      where: { id: initialProjectId },
      data: { isDeleted: true },
    });

    const newCommand = new CreateProjectCommand({
      organizationId,
      projectName,
    });

    const newProjectId = await execute(newCommand);

    await prismaService.project.findFirstOrThrow({
      where: {
        id: newProjectId,
        organizationId,
        name: projectName,
        isDeleted: false,
      },
    });

    expect(newProjectId).not.toBe(initialProjectId);
  });

  it('should not create a new project with name that is used by another project', async () => {
    const { organizationId } = await prepareProject(prismaService);
    const projectName = 'reusedProjectName';

    const initialCommand = new CreateProjectCommand({
      organizationId,
      projectName,
    });

    await execute(initialCommand);

    const sameProject = new CreateProjectCommand({
      organizationId,
      projectName,
    });

    await expect(execute(sameProject)).rejects.toThrow(
      `Project with name ${projectName} already exists`,
    );
  });

  let prismaService: PrismaService;
  let commandBus: CommandBus;

  function execute(
    command: CreateProjectCommand,
  ): Promise<CreateProjectCommandReturnType> {
    return commandBus.execute(command);
  }

  beforeEach(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
  });

  afterEach(async () => {
    prismaService.$disconnect();
  });
});
