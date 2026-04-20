import { CommandBus } from '@nestjs/cqrs';
import { TestingModule } from '@nestjs/testing';
import { EngineApiService } from '@revisium/engine';
import {
  ApiCreateProjectCommand,
  ApiCreateProjectCommandReturnType,
} from 'src/features/project/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { createProjectCommandTestKit } from 'src/testing/kit/create-project-command-test-kit';
import { prepareProject } from 'src/testing/utils/prepareProject';

describe('ApiCreateProjectHandler fork hook', () => {
  let commandBus: CommandBus;
  let moduleFixture: TestingModule;
  let engine: EngineApiService;
  let prismaService: PrismaService;
  let closeModule: () => Promise<void>;
  let backfillSpy: jest.SpyInstance;

  function execute(
    command: ApiCreateProjectCommand,
  ): Promise<ApiCreateProjectCommandReturnType> {
    return commandBus.execute(command);
  }

  beforeAll(async () => {
    const kit = await createProjectCommandTestKit();
    moduleFixture = kit.module;
    commandBus = kit.commandBus;
    prismaService = kit.prismaService;
    closeModule = kit.close;
    engine = moduleFixture.get(EngineApiService);
  });

  beforeEach(() => {
    backfillSpy = jest.spyOn(engine, 'backfillProjectFileBlobs');
  });

  afterEach(() => {
    backfillSpy.mockRestore();
  });

  afterAll(async () => {
    await closeModule();
  });

  it('does not run backfill for a fresh project (no fromRevisionId)', async () => {
    const { organizationId } = await prepareProject(moduleFixture);

    await execute(
      new ApiCreateProjectCommand({
        organizationId,
        projectName: `fresh-${Date.now()}`,
      }),
    );

    expect(backfillSpy).not.toHaveBeenCalled();
  });

  it('runs backfill on the new projectId when fromRevisionId is provided (fork)', async () => {
    const { organizationId, headRevisionId } =
      await prepareProject(moduleFixture);

    const result = await execute(
      new ApiCreateProjectCommand({
        organizationId,
        projectName: `fork-${Date.now()}`,
        fromRevisionId: headRevisionId,
      }),
    );

    expect(backfillSpy).toHaveBeenCalledTimes(1);
    expect(backfillSpy).toHaveBeenCalledWith({ projectId: result.id });

    const persisted = await prismaService.project.findUniqueOrThrow({
      where: { id: result.id },
      select: { organizationId: true },
    });
    expect(persisted.organizationId).toBe(organizationId);
  });
});
