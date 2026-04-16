import { CommandBus } from '@nestjs/cqrs';
import { TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { prepareProject } from 'src/testing/utils/prepareProject';
import { UserProjectRoles, UserSystemRoles } from 'src/features/auth/consts';
import { createTestingModule } from 'src/testing/project/project-command-test-utils';
import {
  RemoveUserFromProjectCommand,
  RemoveUserFromProjectCommandReturnType,
} from 'src/features/project/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

describe('RemoveUserFromProject', () => {
  it('should remove user from project', async () => {
    const { organizationId, projectName, projectId } =
      await prepareProject(moduleFixture);

    const user = await prismaService.user.create({
      data: {
        id: nanoid(),
        roleId: UserSystemRoles.systemUser,
        password: '',
        userProjects: {
          create: {
            id: nanoid(),
            projectId,
            roleId: UserProjectRoles.developer,
          },
        },
      },
    });

    const command = new RemoveUserFromProjectCommand({
      organizationId,
      projectName,
      userId: user.id,
    });

    const result = await execute(command);

    const projectUser = await prismaService.userProject.findFirst({
      where: {
        userId: user.id,
        projectId,
      },
    });

    expect(result).toBe(true);
    expect(projectUser).toBe(null);
  });

  it('should not add remove from project if the project is deleted', async () => {
    const { organizationId, projectName, projectId } =
      await prepareProject(moduleFixture);

    await prismaService.user.create({
      data: {
        id: nanoid(),
        roleId: UserSystemRoles.systemUser,
        password: '',
        userProjects: {
          create: {
            id: nanoid(),
            projectId,
            roleId: UserProjectRoles.developer,
          },
        },
      },
    });

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

    const command = new RemoveUserFromProjectCommand({
      organizationId,
      projectName,
      userId: user.id,
    });

    const projectUser = await prismaService.userProject.findFirst({
      where: {
        userId: user.id,
        projectId,
      },
    });

    await expect(execute(command)).rejects.toThrow('Project not found');
    expect(projectUser).toBe(null);
  });

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let endpointNotificationService: EndpointNotificationService;
  let moduleFixture: TestingModule;
  let closeModule: () => Promise<void>;

  function execute(
    command: RemoveUserFromProjectCommand,
  ): Promise<RemoveUserFromProjectCommandReturnType> {
    return commandBus.execute(command);
  }

  beforeAll(async () => {
    const result = await createTestingModule();
    moduleFixture = result.module;
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    endpointNotificationService = result.endpointNotificationService;
    closeModule = result.close;
  });

  beforeEach(() => {
    endpointNotificationService.delete = jest.fn();
  });

  afterAll(async () => {
    await closeModule();
  });
});
