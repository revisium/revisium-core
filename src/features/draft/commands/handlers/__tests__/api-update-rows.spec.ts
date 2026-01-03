import { CommandBus } from '@nestjs/cqrs';
import { prepareProject, prepareRow } from 'src/__tests__/utils/prepareProject';
import { ApiUpdateRowsCommand } from 'src/features/draft/commands/impl/api-update-rows.command';
import { ApiUpdateRowsHandlerReturnType } from 'src/features/draft/commands/types/api-update-rows.handler.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  createTestingModule,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';
import { PluginService } from 'src/features/plugin/plugin.service';

describe('ApiUpdateRowsHandler', () => {
  it('should update multiple rows', async () => {
    const {
      draftRevisionId,
      tableId,
      draftTableVersionId,
      headTableVersionId,
      rowId,
    } = await prepareProject(prismaService);
    jest.spyOn(endpointNotificationService, 'update').mockResolvedValue(void 0);

    const row2 = await prepareRow({
      prismaService,
      headTableVersionId,
      draftTableVersionId,
      data: { ver: 10 },
      dataDraft: { ver: 20 },
      schema: testSchema,
    });

    const command = new ApiUpdateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rows: [
        { rowId, data: { ver: 100 } },
        { rowId: row2.rowId, data: { ver: 200 } },
      ],
    });

    const result = await execute(command);

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].data).toEqual({ ver: 100 });
    expect(result.rows[1].data).toEqual({ ver: 200 });
    expect(result.table.versionId).toBe(draftTableVersionId);
    expect(result.previousVersionTableId).toBe(draftTableVersionId);

    expect(endpointNotificationService.update).not.toHaveBeenCalled();
  });

  it('should update a single row via bulk operation', async () => {
    const { draftRevisionId, tableId, draftTableVersionId, rowId } =
      await prepareProject(prismaService);
    jest.spyOn(endpointNotificationService, 'update').mockResolvedValue(void 0);

    const command = new ApiUpdateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rows: [{ rowId, data: { ver: 999 } }],
    });

    const result = await execute(command);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toBe(rowId);
    expect(result.rows[0].data).toEqual({ ver: 999 });
    expect(result.table.versionId).toBe(draftTableVersionId);
  });

  it('should notify endpoints if a new table was created', async () => {
    const {
      draftRevisionId,
      draftEndpointId,
      tableId,
      draftTableVersionId,
      headTableVersionId,
      rowId,
    } = await prepareProject(prismaService);

    const row2 = await prepareRow({
      prismaService,
      headTableVersionId,
      draftTableVersionId,
      data: { ver: 10 },
      dataDraft: { ver: 20 },
      schema: testSchema,
    });

    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: true,
      },
    });
    jest.spyOn(endpointNotificationService, 'update').mockResolvedValue(void 0);

    const command = new ApiUpdateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rows: [
        { rowId, data: { ver: 100 } },
        { rowId: row2.rowId, data: { ver: 200 } },
      ],
    });

    const result = await execute(command);

    expect(result.table.versionId).not.toBe(draftTableVersionId);
    expect(result.previousVersionTableId).toBe(draftTableVersionId);
    expect(endpointNotificationService.update).toHaveBeenCalledWith(
      draftEndpointId,
    );
  });

  it('should pass isRestore=true to plugin service', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);
    jest.spyOn(endpointNotificationService, 'update').mockResolvedValue(void 0);

    const afterUpdateRowSpy = jest.spyOn(pluginService, 'afterUpdateRow');

    const command = new ApiUpdateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rows: [{ rowId, data: { ver: 42 } }],
      isRestore: true,
    });

    await execute(command);

    expect(afterUpdateRowSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        isRestore: true,
      }),
    );
  });

  it('should pass isRestore=false (undefined) to plugin service by default', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);
    jest.spyOn(endpointNotificationService, 'update').mockResolvedValue(void 0);

    const afterUpdateRowSpy = jest.spyOn(pluginService, 'afterUpdateRow');

    const command = new ApiUpdateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rows: [{ rowId, data: { ver: 42 } }],
    });

    await execute(command);

    expect(afterUpdateRowSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        isRestore: undefined,
      }),
    );
  });

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let endpointNotificationService: EndpointNotificationService;
  let pluginService: PluginService;

  function execute(
    command: ApiUpdateRowsCommand,
  ): Promise<ApiUpdateRowsHandlerReturnType> {
    return commandBus.execute(command);
  }

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    endpointNotificationService = result.endpointNotificationService;
    pluginService = result.module.get<PluginService>(PluginService);
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
