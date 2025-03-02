import { CommandBus } from '@nestjs/cqrs';
import {prepareBranch} from "src/__tests__/utils/prepareBranch";
import { ApiUpdateTableCommand } from 'src/features/draft/commands/impl/api-update-table.command';
import { ApiUpdateTableHandlerReturnType } from 'src/features/draft/commands/types/api-update-table.handler.types';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  createMock,
  createTestingModule,

} from 'src/features/draft/commands/handlers/__tests__/utils';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

describe('ApiUpdateTableHandler', () => {
  it('should update the table', async () => {
    const { draftRevisionId, draftEndpointId, draftTableVersionId, tableId } =
      await prepareBranch(prismaService);

    endpointNotificationService.update = createMock(void 0);

    const command = new ApiUpdateTableCommand({
      revisionId: draftRevisionId,
      tableId,
      patches: [
        {
          op: 'replace',
          path: '/properties/ver',
          value: {
            type: JsonSchemaTypeName.String,
            default: '',
          },
        },
      ],
    });

    const result = await execute(command);

    const table = await prismaService.table.findFirstOrThrow({
      where: {
        versionId: draftTableVersionId,
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
    command: ApiUpdateTableCommand,
  ): Promise<ApiUpdateTableHandlerReturnType> {
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
