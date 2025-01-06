import { CommandBus } from '@nestjs/cqrs';
import {
  prepareProject,
  createTestingModule,
} from 'src/features/project/commands/handlers/__tests__/utils';
import {
  ApiCreateProjectCommand,
  ApiCreateProjectCommandReturnType,
} from 'src/features/project/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('ApiCreateProjectHandler', () => {
  it('should create a new project', async () => {
    const { organizationId, branchName } = await prepareProject(prismaService);

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

  let prismaService: PrismaService;
  let commandBus: CommandBus;

  function execute(
    command: ApiCreateProjectCommand,
  ): Promise<ApiCreateProjectCommandReturnType> {
    return commandBus.execute(command);
  }

  beforeEach(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
  });

  afterEach(async () => {
    prismaService.$disconnect();
  });
});
