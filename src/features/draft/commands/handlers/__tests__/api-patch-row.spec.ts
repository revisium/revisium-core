import { CommandBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import {
  ApiPatchRowCommand,
  ApiPatchRowCommandReturnType,
} from 'src/features/draft/commands/impl/api-patch-row.command';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

describe('ApiPatchRowHandler', () => {
  it('should patch the row', async () => {
    const { draftRevisionId, tableId, draftTableVersionId, rowId } =
      await prepareProject(prismaService);
    jest.spyOn(endpointNotificationService, 'update').mockResolvedValue(void 0);

    const command = new ApiPatchRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      patches: [
        {
          op: 'replace',
          path: 'ver',
          value: 100,
        },
      ],
    });

    const result = await execute(command);

    const row = await prismaService.row.findFirstOrThrow({
      where: {
        id: rowId,
        tables: {
          some: {
            versionId: draftTableVersionId,
          },
        },
      },
    });
    expect(result.row).toStrictEqual({
      ...row,
      data: { ver: 100 },
      context: {
        revisionId: draftRevisionId,
        tableId,
      },
    });
    expect(result.table?.versionId).toBe(draftTableVersionId);
    expect(result.previousVersionTableId).toBe(draftTableVersionId);

    expect(endpointNotificationService.update).not.toHaveBeenCalled();
  });

  it('should notify endpoints if a new table was created', async () => {
    const {
      draftRevisionId,
      draftEndpointId,
      tableId,
      draftTableVersionId,
      rowId,
    } = await prepareProject(prismaService);
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: true,
      },
    });
    jest.spyOn(endpointNotificationService, 'update').mockResolvedValue(void 0);

    const command = new ApiPatchRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      patches: [
        {
          op: 'replace',
          path: 'ver',
          value: 100,
        },
      ],
    });

    const result = await execute(command);

    expect(result.table?.versionId).not.toBe(draftTableVersionId);
    expect(result.previousVersionTableId).toBe(draftTableVersionId);
    expect(endpointNotificationService.update).toHaveBeenCalledWith(
      draftEndpointId,
    );
  });

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let endpointNotificationService: EndpointNotificationService;

  function execute(
    command: ApiPatchRowCommand,
  ): Promise<ApiPatchRowCommandReturnType> {
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
