import { CommandBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { ApiCreateRowsCommand } from 'src/features/draft/commands/impl/api-create-rows.command';
import { ApiCreateRowsHandlerReturnType } from 'src/features/draft/commands/types/api-create-rows.handler.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

describe('ApiCreateRowsHandler', () => {
  it('should create multiple rows', async () => {
    const { draftRevisionId, tableId, draftTableVersionId } =
      await prepareProject(prismaService);
    jest.spyOn(endpointNotificationService, 'update').mockResolvedValue(void 0);

    const command = new ApiCreateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rows: [
        { rowId: 'newRow1', data: { ver: 1 } },
        { rowId: 'newRow2', data: { ver: 2 } },
        { rowId: 'newRow3', data: { ver: 3 } },
      ],
    });

    const result = await execute(command);

    const rows = await prismaService.row.findMany({
      where: {
        id: { in: ['newRow1', 'newRow2', 'newRow3'] },
        tables: {
          some: {
            versionId: draftTableVersionId,
          },
        },
      },
      orderBy: { id: 'asc' },
    });
    expect(rows).toHaveLength(3);
    expect(result.rows).toHaveLength(3);
    expect(result.rows.map((r) => r.id)).toEqual([
      'newRow1',
      'newRow2',
      'newRow3',
    ]);
    expect(result.table.versionId).toBe(draftTableVersionId);
    expect(result.previousVersionTableId).toBe(draftTableVersionId);

    expect(endpointNotificationService.update).not.toHaveBeenCalled();
  });

  it('should create a single row via bulk operation', async () => {
    const { draftRevisionId, tableId, draftTableVersionId } =
      await prepareProject(prismaService);
    jest.spyOn(endpointNotificationService, 'update').mockResolvedValue(void 0);

    const command = new ApiCreateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rows: [{ rowId: 'singleRow', data: { ver: 42 } }],
    });

    const result = await execute(command);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toBe('singleRow');
    expect(result.rows[0].data).toEqual({ ver: 42 });
    expect(result.table.versionId).toBe(draftTableVersionId);
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

    const command = new ApiCreateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rows: [
        { rowId: 'newRow1', data: { ver: 1 } },
        { rowId: 'newRow2', data: { ver: 2 } },
      ],
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
    command: ApiCreateRowsCommand,
  ): Promise<ApiCreateRowsHandlerReturnType> {
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
