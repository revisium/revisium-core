import { CommandBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { UserProjectRoles, UserSystemRoles } from 'src/features/auth/consts';
import { createTestingModule } from 'src/features/project/commands/handlers/__tests__/utils';
import {
  AddUserToProjectCommand,
  AddUserToProjectCommandReturnType,
} from 'src/features/project/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

describe('AddUserToProject', () => {
  it('should add user to project', async () => {
    const { organizationId, projectName, projectId } =
      await prepareProject(prismaService);

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
      await prepareProject(prismaService);

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

  function execute(
    command: AddUserToProjectCommand,
  ): Promise<AddUserToProjectCommandReturnType> {
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
