import { CommandBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { ApiCreateTableCommand } from 'src/features/draft/commands/impl/api-create-table.command';
import { ApiCreateTableHandlerReturnType } from 'src/features/draft/commands/types/api-create-table.handler.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  createMock,
  createTestingModule,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

describe('ApiCreateTableHandler', () => {
  it('should create a new table', async () => {
    const { branchId, draftRevisionId, draftEndpointId } =
      await prepareProject(prismaService);

    endpointNotificationService.update = createMock(void 0);

    const newTableId = 'newTableId';
    const command = new ApiCreateTableCommand({
      revisionId: draftRevisionId,
      tableId: newTableId,
      schema: testSchema,
    });

    const result = await execute(command);

    const table = await prismaService.table.findFirstOrThrow({
      where: {
        id: newTableId,
        revisions: {
          some: {
            id: draftRevisionId,
          },
        },
      },
    });
    expect(result.branch.id).toBe(branchId);
    expect(result.table.versionId).toBe(table.versionId);

    expect(endpointNotificationService.update).toHaveBeenCalledWith(
      draftEndpointId,
    );
  });

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let endpointNotificationService: EndpointNotificationService;

  function execute(
    command: ApiCreateTableCommand,
  ): Promise<ApiCreateTableHandlerReturnType> {
    return commandBus.execute(command);
  }

  beforeEach(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    endpointNotificationService = result.endpointNotificationService;
  });

  afterEach(async () => {
    prismaService.$disconnect();
  });
});
