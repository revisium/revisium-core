import { CommandBus } from '@nestjs/cqrs';
import { TestingModule } from '@nestjs/testing';
import { prepareProject } from 'src/testing/utils/prepareProject';
import { createTestingModule } from 'src/testing/project/project-command-test-utils';
import {
  DeleteProjectCommand,
  DeleteProjectCommandReturnType,
} from 'src/features/project/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

describe('DeleteProjectHandler', () => {
  it('should delete project', async () => {
    const { organizationId, projectName, draftEndpointId, headEndpointId } =
      await prepareProject(moduleFixture);

    const { headEndpointId: anotherEndpointId } =
      await prepareProject(moduleFixture);

    const command = new DeleteProjectCommand({
      organizationId,
      projectName,
    });

    const result = await execute(command);

    expect(endpointNotificationService.delete).toHaveBeenCalledTimes(2);
    expect(endpointNotificationService.delete).toHaveBeenNthCalledWith(
      1,
      headEndpointId,
    );
    expect(endpointNotificationService.delete).toHaveBeenNthCalledWith(
      2,
      draftEndpointId,
    );

    const project = await prismaService.project.findFirstOrThrow({
      where: {
        organizationId,
        name: projectName,
      },
      include: {
        branches: true,
      },
    });

    expect(result).toBe(true);
    expect(project.isDeleted).toBe(true);
    expect(project.branches.length).toBe(1);

    const restApiEndpoint = await prismaService.endpoint.findUniqueOrThrow({
      where: {
        id: headEndpointId,
      },
    });
    expect(restApiEndpoint.isDeleted).toBe(true);

    const graphqlEndpoint = await prismaService.endpoint.findUniqueOrThrow({
      where: {
        id: draftEndpointId,
      },
    });
    expect(graphqlEndpoint.isDeleted).toBe(true);

    const anotherEndpoint = await prismaService.endpoint.findUniqueOrThrow({
      where: {
        id: anotherEndpointId,
      },
    });
    expect(anotherEndpoint.isDeleted).toBe(false);
  });

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let endpointNotificationService: EndpointNotificationService;
  let moduleFixture: TestingModule;

  function execute(
    command: DeleteProjectCommand,
  ): Promise<DeleteProjectCommandReturnType> {
    return commandBus.execute(command);
  }

  beforeAll(async () => {
    const result = await createTestingModule();
    moduleFixture = result.module;
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
