import { CommandBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import {
  ApiRevertChangesCommand,
  ApiRevertChangesCommandReturnType,
} from 'src/features/draft/commands/impl/api-revert-changes.command';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

describe('ApiRevertChangesHandler', () => {
  it('should revert changes', async () => {
    const {
      branchId,
      organizationId,
      projectName,
      branchName,
      draftEndpointId,
      draftRevisionId,
    } = await prepareProject(prismaService);
    await prismaService.revision.update({
      where: {
        id: draftRevisionId,
      },
      data: {
        hasChanges: true,
      },
    });

    jest
      .spyOn(endpointNotificationService, 'update')
      .mockResolvedValue(void 0);

    const command = new ApiRevertChangesCommand({
      organizationId,
      projectName,
      branchName,
    });

    const result = await execute(command);

    expect(result.id).toStrictEqual(branchId);

    expect(endpointNotificationService.update).toHaveBeenCalledWith(
      draftEndpointId,
    );
  });

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let endpointNotificationService: EndpointNotificationService;

  function execute(
    command: ApiRevertChangesCommand,
  ): Promise<ApiRevertChangesCommandReturnType> {
    return commandBus.execute(command);
  }

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    endpointNotificationService = result.endpointNotificationService;
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
