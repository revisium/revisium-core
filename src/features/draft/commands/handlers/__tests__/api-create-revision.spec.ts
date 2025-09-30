import { CommandBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import {
  ApiCreateRevisionCommand,
  ApiCreateRevisionCommandReturnType,
} from 'src/features/draft/commands/impl/api-create-revision.command';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

describe('ApiCreateRevisionHandler', () => {
  it('should create a new draft revision', async () => {
    const {
      organizationId,
      projectName,
      branchName,
      draftRevisionId,
      headEndpointId,
      draftEndpointId,
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

    const command = new ApiCreateRevisionCommand({
      organizationId,
      projectName,
      branchName,
      comment: 'comment',
    });

    const result = await execute(command);

    const nextDraftRevision = await prismaService.revision.findFirstOrThrow({
      where: { parentId: draftRevisionId },
    });
    expect(result).toStrictEqual(nextDraftRevision);

    expect(endpointNotificationService.update).nthCalledWith(
      1,
      draftEndpointId,
    );
    expect(endpointNotificationService.update).nthCalledWith(2, headEndpointId);
  });

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let endpointNotificationService: EndpointNotificationService;

  function execute(
    command: ApiCreateRevisionCommand,
  ): Promise<ApiCreateRevisionCommandReturnType> {
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
