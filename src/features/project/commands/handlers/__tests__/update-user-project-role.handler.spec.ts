import { CommandBus } from '@nestjs/cqrs';
import { TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { prepareProject } from 'src/testing/utils/prepareProject';
import { UserProjectRoles, UserSystemRoles } from 'src/features/auth/consts';
import { createProjectCommandTestKit } from 'src/testing/kit/create-project-command-test-kit';
import {
  UpdateUserProjectRoleCommand,
  UpdateUserProjectRoleCommandReturnType,
} from 'src/features/project/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

describe('UpdateUserProjectRole', () => {
  it('should update user role in project', async () => {
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

    const command = new UpdateUserProjectRoleCommand({
      organizationId,
      projectName,
      userId: user.id,
      roleId: UserProjectRoles.reader,
    });

    const result = await execute(command);

    const projectUser = await prismaService.userProject.findFirst({
      where: {
        userId: user.id,
        projectId,
      },
    });

    expect(result).toBe(true);
    expect(projectUser?.roleId).toBe(UserProjectRoles.reader);
  });

  it('should not update user role if project is deleted', async () => {
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

    await prismaService.project.update({
      where: {
        id: projectId,
      },
      data: {
        isDeleted: true,
      },
    });

    const command = new UpdateUserProjectRoleCommand({
      organizationId,
      projectName,
      userId: user.id,
      roleId: UserProjectRoles.reader,
    });

    await expect(execute(command)).rejects.toThrow('Project not found');
  });

  it('should not update role if user is not a member of the project', async () => {
    const { organizationId, projectName } = await prepareProject(moduleFixture);

    const user = await prismaService.user.create({
      data: {
        id: nanoid(),
        roleId: UserSystemRoles.systemUser,
        password: '',
      },
    });

    const command = new UpdateUserProjectRoleCommand({
      organizationId,
      projectName,
      userId: user.id,
      roleId: UserProjectRoles.reader,
    });

    await expect(execute(command)).rejects.toThrow(
      'User is not a member of this project',
    );
  });

  it('should not update role if role is invalid', async () => {
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

    const command = new UpdateUserProjectRoleCommand({
      organizationId,
      projectName,
      userId: user.id,
      roleId: 'invalid-role-id',
    });

    await expect(execute(command)).rejects.toThrow('Invalid ProjectRole');
  });

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let endpointNotificationService: EndpointNotificationService;
  let moduleFixture: TestingModule;
  let closeModule: () => Promise<void>;

  function execute(
    command: UpdateUserProjectRoleCommand,
  ): Promise<UpdateUserProjectRoleCommandReturnType> {
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
