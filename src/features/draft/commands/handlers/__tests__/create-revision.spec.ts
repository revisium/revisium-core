import { CommandBus } from '@nestjs/cqrs';
import {
  prepareProject,
  PrepareProjectReturnType,
} from 'src/__tests__/utils/prepareProject';
import { CacheService } from 'src/infrastructure/cache';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { CreateRevisionCommand } from 'src/features/draft/commands/impl/create-revision.command';
import { CreateRevisionHandlerReturnType } from 'src/features/draft/commands/types/create-revision.handler.types';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

describe('CreateRevisionHandler', () => {
  it('should throw an error if the project does not exist in the organization', async () => {
    const ids = await prepareProject(prismaService);
    const { organizationId, projectName, branchName } = ids;
    await prepareRevision(ids);

    jest
      .spyOn(shareTransactionalQueries, 'findProjectInOrganizationOrThrow')
      .mockRejectedValue(new Error('Project not found'));

    const command = new CreateRevisionCommand({
      organizationId,
      projectName,
      branchName,
    });

    await expect(runTransaction(command)).rejects.toThrow('Project not found');
  });

  it('should throw an error if the branch does not exist in the project', async () => {
    const ids = await prepareProject(prismaService);
    const { organizationId, projectName, branchName } = ids;
    await prepareRevision(ids);

    jest
      .spyOn(shareTransactionalQueries, 'findBranchInProjectOrThrow')
      .mockRejectedValue(new Error('Branch not found'));

    const command = new CreateRevisionCommand({
      organizationId,
      projectName,
      branchName,
    });

    await expect(runTransaction(command)).rejects.toThrow('Branch not found');
  });

  it('should create a new draft revision if there are changes', async () => {
    const ids = await prepareProject(prismaService);
    const {
      organizationId,
      projectName,
      branchName,
      headRevisionId,
      draftRevisionId,
      headEndpointId,
      draftEndpointId,
    } = ids;
    await prepareRevision(ids);

    const command = new CreateRevisionCommand({
      organizationId,
      projectName,
      branchName,
      comment: 'comment',
    });
    const result = await runTransaction(command);

    expect(result.headEndpoints).toEqual([headEndpointId]);
    expect(result.draftEndpoints).toEqual([draftEndpointId]);
    expect(result.previousDraftRevisionId).toEqual(draftRevisionId);
    expect(result.previousHeadRevisionId).toEqual(headRevisionId);
    expect(result.nextDraftRevisionId).not.toEqual(draftRevisionId);

    expect(cacheService.deleteByTag).toHaveBeenCalledWith({
      tags: [`revision-${headRevisionId}`, `revision-${draftRevisionId}`],
    });
  });

  it('should create revision when deleted endpoints exist in target revision', async () => {
    const ids = await prepareProject(prismaService);
    const {
      organizationId,
      projectName,
      branchName,
      headRevisionId,
      draftRevisionId,
      headEndpointId,
      draftEndpointId,
    } = ids;

    const nextDraftRevisionId = await prismaService.revision.create({
      data: {
        id: 'temp-next-draft',
        isDraft: false,
        isHead: false,
        hasChanges: false,
        branchId: (
          await prismaService.revision.findUniqueOrThrow({
            where: { id: draftRevisionId },
          })
        ).branchId,
        parentId: draftRevisionId,
      },
      select: { id: true },
    });

    const draftEndpoint = await prismaService.endpoint.findUniqueOrThrow({
      where: { id: draftEndpointId },
    });
    await prismaService.endpoint.create({
      data: {
        id: 'deleted-endpoint-id',
        type: draftEndpoint.type,
        revisionId: nextDraftRevisionId.id,
        isDeleted: true,
        versionId: draftEndpoint.versionId,
      },
    });

    await prismaService.endpoint.delete({
      where: { id: 'deleted-endpoint-id' },
    });
    await prismaService.revision.delete({
      where: { id: nextDraftRevisionId.id },
    });

    await prismaService.revision.update({
      where: { id: draftRevisionId },
      data: { hasChanges: true },
    });
    await prepareRevision(ids);

    const command = new CreateRevisionCommand({
      organizationId,
      projectName,
      branchName,
      comment: 'comment with deleted endpoints test',
    });

    const result = await runTransaction(command);

    expect(result.headEndpoints).toEqual([headEndpointId]);
    expect(result.draftEndpoints).toEqual([draftEndpointId]);
    expect(result.previousDraftRevisionId).toEqual(draftRevisionId);
    expect(result.previousHeadRevisionId).toEqual(headRevisionId);
  });

  it('should remove deleted endpoints during commit', async () => {
    const ids = await prepareProject(prismaService);
    const {
      organizationId,
      projectName,
      branchName,
      draftRevisionId,
      draftEndpointId,
    } = ids;

    // Mark draft endpoint as deleted
    await prismaService.endpoint.update({
      where: { id: draftEndpointId },
      data: { isDeleted: true },
    });

    await prismaService.revision.update({
      where: { id: draftRevisionId },
      data: { hasChanges: true },
    });

    const command = new CreateRevisionCommand({
      organizationId,
      projectName,
      branchName,
      comment: 'commit with deleted draft endpoint',
    });

    const result = await runTransaction(command);

    expect(result.draftEndpoints).toEqual([]);

    const deletedEndpointAfter = await prismaService.endpoint.findUnique({
      where: { id: draftEndpointId },
    });
    expect(deletedEndpointAfter).toBeNull();
  });

  async function prepareRevision(ids: PrepareProjectReturnType) {
    await prismaService.revision.update({
      where: { id: ids.draftRevisionId },
      data: { hasChanges: true },
    });
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;
  let shareTransactionalQueries: ShareTransactionalQueries;
  let cacheService: CacheService;

  function runTransaction(
    command: CreateRevisionCommand,
  ): Promise<CreateRevisionHandlerReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
    shareTransactionalQueries = result.shareTransactionalQueries;
    cacheService = result.cacheService;
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    cacheService.deleteByTag = jest.fn();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
