import { CommandBus } from '@nestjs/cqrs';
import { TestingModule } from '@nestjs/testing';
import { createProjectCommandTestKit } from 'src/testing/kit/create-project-command-test-kit';
import { prepareProject } from 'src/testing/utils/prepareProject';
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
    const kit = await createProjectCommandTestKit();
    moduleFixture = kit.module;
    commandBus = kit.commandBus;
    closeModule = kit.close;
  });

  afterAll(async () => {
    await closeModule();
  });
});
