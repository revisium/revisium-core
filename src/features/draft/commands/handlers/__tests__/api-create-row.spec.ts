import { CommandBus } from '@nestjs/cqrs';
import { prepareBranch } from 'src/__tests__/utils/prepareBranch';
import { ApiCreateRowCommand } from 'src/features/draft/commands/impl/api-create-row.command';
import { ApiCreateRowHandlerReturnType } from 'src/features/draft/commands/types/api-create-row.handler.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  createMock,
  createTestingModule,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

describe('ApiCreateRowHandler', () => {
  it('should create a new row', async () => {
    const { draftRevisionId, tableId, draftTableVersionId } =
      await prepareBranch(prismaService);
    endpointNotificationService.update = createMock(void 0);

    const newRowId = 'newRowId';
    const command = new ApiCreateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId: newRowId,
      data: { ver: 1 },
    });

    const result = await execute(command);

    const row = await prismaService.row.findFirstOrThrow({
      where: {
        id: newRowId,
        tables: {
          some: {
            versionId: draftTableVersionId,
          },
        },
      },
    });
    expect(result.row).toStrictEqual({
      ...row,
      context: {
        revisionId: draftRevisionId,
        tableId,
      },
    });
    expect(result.table.versionId).toBe(draftTableVersionId);
    expect(result.previousVersionTableId).toBe(draftTableVersionId);

    expect(endpointNotificationService.update).not.toHaveBeenCalled();
  });

  it('should notify endpoints if a new table was created', async () => {
    const { draftRevisionId, draftEndpointId, tableId, draftTableVersionId } =
      await prepareBranch(prismaService);
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: true,
      },
    });
    endpointNotificationService.update = createMock(void 0);

    const newRowId = 'newRowId';
    const command = new ApiCreateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId: newRowId,
      data: { ver: 1 },
    });

    const result = await execute(command);

    expect(result.table.versionId).not.toBe(draftTableVersionId);
    expect(result.previousVersionTableId).toBe(draftTableVersionId);
    expect(endpointNotificationService.update).toHaveBeenCalledWith(
      draftEndpointId,
    );
  });

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let endpointNotificationService: EndpointNotificationService;

  function execute(
    command: ApiCreateRowCommand,
  ): Promise<ApiCreateRowHandlerReturnType> {
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
