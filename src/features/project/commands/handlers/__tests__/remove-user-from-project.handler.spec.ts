import { CommandBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { UserProjectRoles, UserSystemRoles } from 'src/features/auth/consts';
import { createTestingModule } from 'src/features/project/commands/handlers/__tests__/utils';
import {
  RemoveUserFromProjectCommand,
  RemoveUserFromProjectCommandReturnType,
} from 'src/features/project/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

describe('RemoveUserFromProject', () => {
  it('should remove user from project', async () => {
    const { organizationId, projectName, projectId } =
      await prepareProject(prismaService);

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
      await prepareProject(prismaService);

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

  function execute(
    command: RemoveUserFromProjectCommand,
  ): Promise<RemoveUserFromProjectCommandReturnType> {
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
