import { CommandBus } from '@nestjs/cqrs';
import { TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { prepareProject } from 'src/testing/utils/prepareProject';
import { UserProjectRoles, UserSystemRoles } from 'src/features/auth/consts';
import { createProjectCommandTestKit } from 'src/testing/kit/create-project-command-test-kit';
import {
  AddUserToProjectCommand,
  AddUserToProjectCommandReturnType,
} from 'src/features/project/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

describe('AddUserToProject', () => {
  it('should add user to project', async () => {
    const { organizationId, projectName, projectId } =
      await prepareProject(moduleFixture);

    const user = await prismaService.user.create({
      data: {
        id: nanoid(),
        roleId: UserSystemRoles.systemUser,
        password: '',
      },
    });

    const command = new AddUserToProjectCommand({
      organizationId,
      projectName,
      userId: user.id,
      roleId: UserProjectRoles.developer,
    });

    const result = await execute(command);

    const projectUser = await prismaService.userProject.findFirst({
      where: {
        userId: user.id,
        projectId,
      },
    });

    expect(result).toBe(true);
    expect(projectUser?.roleId).toBe(UserProjectRoles.developer);
  });

  it('should not add user to project if the project is deleted', async () => {
    const { organizationId, projectName, projectId } =
      await prepareProject(moduleFixture);

    await prismaService.project.update({
      where: {
        id: projectId,
      },
      data: {
        isDeleted: true,
      },
    });

    const user = await prismaService.user.create({
      data: {
        id: nanoid(),
        roleId: UserSystemRoles.systemUser,
        password: '',
      },
    });

    const command = new AddUserToProjectCommand({
      organizationId,
      projectName,
      userId: user.id,
      roleId: UserProjectRoles.developer,
    });

    await expect(execute(command)).rejects.toThrow('Project not found');
  });

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let endpointNotificationService: EndpointNotificationService;
  let moduleFixture: TestingModule;
  let closeModule: () => Promise<void>;

  function execute(
    command: AddUserToProjectCommand,
  ): Promise<AddUserToProjectCommandReturnType> {
    return commandBus.execute(command);
  }

  beforeAll(async () => {
    const kit = await createProjectCommandTestKit();
    moduleFixture = kit.module;
    prismaService = kit.prismaService;
    commandBus = kit.commandBus;
    endpointNotificationService = kit.endpointNotificationService;
    closeModule = kit.close;
  });

  beforeEach(() => {
    endpointNotificationService.delete = jest.fn();
  });

  afterAll(async () => {
    await closeModule();
  });
});
