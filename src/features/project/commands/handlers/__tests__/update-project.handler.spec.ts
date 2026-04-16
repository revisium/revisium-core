import { CommandBus } from '@nestjs/cqrs';
import { TestingModule } from '@nestjs/testing';
import { prepareProject } from 'src/testing/utils/prepareProject';
import { createTestingModule } from 'src/testing/project/project-command-test-utils';
import {
  UpdateProjectCommand,
  UpdateProjectCommandReturnType,
} from 'src/features/project/commands/impl';
import { AuthCacheService } from 'src/infrastructure/cache/services/auth-cache.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('UpdateProjectHandler', () => {
  it('should update isPublic', async () => {
    const { organizationId, projectName, projectId } =
      await prepareProject(moduleFixture);

    const command = new UpdateProjectCommand({
      organizationId,
      projectName,
      isPublic: true,
    });

    const result = await execute(command);

    const project = await prismaService.project.findUnique({
      where: { id: projectId },
    });

    expect(result).toBe(true);
    expect(project?.isPublic).toBe(true);
  });

  it('should invalidate project permissions cache after update', async () => {
    const { organizationId, projectName } = await prepareProject(moduleFixture);

    const spy = jest.spyOn(authCacheService, 'invalidateProjectPermissions');

    const command = new UpdateProjectCommand({
      organizationId,
      projectName,
      isPublic: true,
    });

    await execute(command);

    expect(spy).toHaveBeenCalledWith(organizationId, projectName);

    spy.mockRestore();
  });

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let authCacheService: AuthCacheService;
  let moduleFixture: TestingModule;
  let closeModule: () => Promise<void>;

  function execute(
    command: UpdateProjectCommand,
  ): Promise<UpdateProjectCommandReturnType> {
    return commandBus.execute(command);
  }

  beforeAll(async () => {
    const result = await createTestingModule();
    moduleFixture = result.module;
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    authCacheService = result.module.get(AuthCacheService);
    closeModule = result.close;
  });

  afterAll(async () => {
    await closeModule();
  });
});
