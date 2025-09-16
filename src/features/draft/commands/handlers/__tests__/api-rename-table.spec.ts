import { CommandBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import {
  ApiRenameTableCommand,
  ApiRenameTableCommandReturnType,
} from 'src/features/draft/commands/impl/api-rename-table.command';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  createMock,
  createTestingModule,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

describe('ApiRenameTableHandler', () => {
  const nextTableId = 'nextTableId';

  it('should rename the table', async () => {
    const { draftRevisionId, draftEndpointId, draftTableVersionId, tableId } =
      await prepareProject(prismaService);

    endpointNotificationService.update = createMock(void 0);

    const command = new ApiRenameTableCommand({
      revisionId: draftRevisionId,
      tableId,
      nextTableId,
    });

    const result = await execute(command);

    const table = await prismaService.table.findFirstOrThrow({
      where: {
        id: nextTableId,
        revisions: {
          some: {
            id: draftRevisionId,
          },
        },
      },
    });

    expect(result.previousVersionTableId).toBe(draftTableVersionId);
    expect(result.table).toStrictEqual({
      ...table,
      context: {
        revisionId: draftRevisionId,
      },
    });

    expect(endpointNotificationService.update).toHaveBeenCalledWith(
      draftEndpointId,
    );
  });

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let endpointNotificationService: EndpointNotificationService;

  function execute(
    command: ApiRenameTableCommand,
  ): Promise<ApiRenameTableCommandReturnType> {
    return commandBus.execute(command);
  }

  beforeEach(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    endpointNotificationService = result.endpointNotificationService;
  });

  afterEach(async () => {
    await prismaService.$disconnect();
  });
});
