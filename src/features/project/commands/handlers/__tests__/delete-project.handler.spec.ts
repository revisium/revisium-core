import { CommandBus } from '@nestjs/cqrs';
import { TestingModule } from '@nestjs/testing';
import { prepareProject } from 'src/testing/utils/prepareProject';
import { createProjectCommandTestKit } from 'src/testing/kit/create-project-command-test-kit';
import {
  DeleteProjectCommand,
  DeleteProjectCommandReturnType,
} from 'src/features/project/commands/impl';
import { AuthCacheService } from 'src/infrastructure/cache/services/auth-cache.service';
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

  it('should invalidate project permissions cache after delete', async () => {
    const { organizationId, projectName } = await prepareProject(moduleFixture);

    const spy = jest.spyOn(authCacheService, 'invalidateProjectPermissions');

    await execute(new DeleteProjectCommand({ organizationId, projectName }));

    expect(spy).toHaveBeenCalledWith(organizationId, projectName);

    spy.mockRestore();
  });

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let endpointNotificationService: EndpointNotificationService;
  let authCacheService: AuthCacheService;
  let moduleFixture: TestingModule;
  let closeModule: () => Promise<void>;

  function execute(
    command: DeleteProjectCommand,
  ): Promise<DeleteProjectCommandReturnType> {
    return commandBus.execute(command);
  }

  beforeAll(async () => {
    const kit = await createProjectCommandTestKit();
    moduleFixture = kit.module;
    prismaService = kit.prismaService;
    commandBus = kit.commandBus;
    endpointNotificationService = kit.endpointNotificationService;
    authCacheService = kit.module.get(AuthCacheService);
    closeModule = kit.close;
  });

  beforeEach(() => {
    endpointNotificationService.delete = jest.fn();
  });

  afterAll(async () => {
    await closeModule();
  });
});
