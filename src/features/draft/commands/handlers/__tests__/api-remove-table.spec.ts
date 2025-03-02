import { CommandBus } from '@nestjs/cqrs';
import { prepareBranch } from 'src/__tests__/utils/prepareBranch';
import { ApiRemoveTableCommand } from 'src/features/draft/commands/impl/api-remove-table.command';
import { ApiRemoveTableHandlerReturnType } from 'src/features/draft/commands/types/api-remove-table.handler.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  createMock,
  createTestingModule,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

describe('ApiRemoveTableHandler', () => {
  it('should remove the table', async () => {
    const { draftRevisionId, draftEndpointId, tableId, branchId } =
      await prepareBranch(prismaService);

    endpointNotificationService.update = createMock(void 0);

    const command = new ApiRemoveTableCommand({
      revisionId: draftRevisionId,
      tableId,
    });

    const result = await execute(command);

    expect(result.branch.id).toBe(branchId);
    expect(endpointNotificationService.update).toHaveBeenCalledWith(
      draftEndpointId,
    );
  });

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let endpointNotificationService: EndpointNotificationService;

  function execute(
    command: ApiRemoveTableCommand,
  ): Promise<ApiRemoveTableHandlerReturnType> {
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
