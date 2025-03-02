import { CommandBus } from '@nestjs/cqrs';
import {prepareBranch} from "src/__tests__/utils/prepareBranch";
import { ApiRemoveRowCommand } from 'src/features/draft/commands/impl/api-remove-row.command';
import { ApiRemoveRowHandlerReturnType } from 'src/features/draft/commands/types/api-remove-row.handler.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  createMock,
  createTestingModule,

} from 'src/features/draft/commands/handlers/__tests__/utils';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

describe('ApiRemoveRowHandler', () => {
  it('should remove the row', async () => {
    const { branchId, draftRevisionId, tableId, draftTableVersionId, rowId } =
      await prepareBranch(prismaService);
    endpointNotificationService.update = createMock(void 0);

    const command = new ApiRemoveRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });

    const result = await execute(command);

    const row = await prismaService.row.findFirst({
      where: {
        id: rowId,
        tables: {
          some: {
            versionId: draftTableVersionId,
          },
        },
      },
    });
    expect(row).toBeNull();
    expect(result.table?.versionId).toBe(draftTableVersionId);
    expect(result.previousVersionTableId).toBe(draftTableVersionId);
    expect(result.branch.id).toBe(branchId);

    expect(endpointNotificationService.update).not.toHaveBeenCalled();
  });

  it('should notify endpoints if a new table was created', async () => {
    const {
      draftRevisionId,
      draftEndpointId,
      tableId,
      draftTableVersionId,
      rowId,
    } = await prepareBranch(prismaService);
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: true,
      },
    });
    endpointNotificationService.update = createMock(void 0);

    const command = new ApiRemoveRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
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
    command: ApiRemoveRowCommand,
  ): Promise<ApiRemoveRowHandlerReturnType> {
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
