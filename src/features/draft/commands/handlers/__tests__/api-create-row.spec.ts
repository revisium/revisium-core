import { CommandBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { ApiCreateRowCommand } from 'src/features/draft/commands/impl/api-create-row.command';
import { ApiCreateRowHandlerReturnType } from 'src/features/draft/commands/types/api-create-row.handler.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

describe('ApiCreateRowHandler', () => {
  it('should create a new row', async () => {
    const { draftRevisionId, tableId, draftTableVersionId } =
      await prepareProject(prismaService);
    jest.spyOn(endpointNotificationService, 'update').mockResolvedValue(void 0);

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
    expect(result.row).toMatchObject({
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
      await prepareProject(prismaService);
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: true,
      },
    });
    jest.spyOn(endpointNotificationService, 'update').mockResolvedValue(void 0);

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
