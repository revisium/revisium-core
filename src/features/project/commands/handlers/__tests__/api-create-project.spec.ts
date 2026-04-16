import { CommandBus } from '@nestjs/cqrs';
import { TestingModule } from '@nestjs/testing';
import {
  prepareProject,
  createTestingModule,
} from 'src/testing/project/project-command-test-utils';
import {
  ApiCreateProjectCommand,
  ApiCreateProjectCommandReturnType,
} from 'src/features/project/commands/impl';

describe('ApiCreateProjectHandler', () => {
  it('should create a new project', async () => {
    const { organizationId, branchName } = await prepareProject(moduleFixture);

    const projectName = 'newProjectName';

    const command = new ApiCreateProjectCommand({
      organizationId,
      projectName,
      branchName,
    });

    const result = await execute(command);

    expect(result.name).toBe(projectName);
    expect(result.organizationId).toBe(organizationId);
    expect(result.isPublic).toBe(false);
  });

  let commandBus: CommandBus;
  let moduleFixture: TestingModule;
  let closeModule: () => Promise<void>;

  function execute(
    command: ApiCreateProjectCommand,
  ): Promise<ApiCreateProjectCommandReturnType> {
    return commandBus.execute(command);
  }

  beforeAll(async () => {
    const result = await createTestingModule();
    moduleFixture = result.module;
    commandBus = result.commandBus;
    closeModule = result.close;
  });

  afterAll(async () => {
    await closeModule();
  });
});
