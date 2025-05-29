import { CommandBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/project/commands/handlers/__tests__/utils';
import {
  DeleteProjectCommand,
  DeleteProjectCommandReturnType,
} from 'src/features/project/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

describe('DeleteProjectHandler', () => {
  it('should delete project', async () => {
    const { organizationId, projectName, draftEndpointId, headEndpointId } =
      await prepareProject(prismaService);

    const { headEndpointId: anotherEndpointId } =
      await prepareProject(prismaService);

    const command = new DeleteProjectCommand({
      organizationId,
      projectName,
    });

    const result = await execute(command);

    expect(endpointNotificationService.delete).toHaveBeenCalledTimes(2);
    expect(endpointNotificationService.delete).toHaveBeenNthCalledWith(
      1,
      headEndpointId,
      'REST_API',
    );
    expect(endpointNotificationService.delete).toHaveBeenNthCalledWith(
      2,
      draftEndpointId,
      'GRAPHQL',
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

  function execute(
    command: DeleteProjectCommand,
  ): Promise<DeleteProjectCommandReturnType> {
    return commandBus.execute(command);
  }

  beforeEach(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    endpointNotificationService = result.endpointNotificationService;

    endpointNotificationService.delete = jest.fn();
  });

  afterEach(async () => {
    await prismaService.$disconnect();
  });
});
