import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  prepareProject,
  PrepareProjectReturnType,
} from 'src/__tests__/utils/prepareProject';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createMock,
  createTestingModule,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { CreateRevisionCommand } from 'src/features/draft/commands/impl/create-revision.command';
import { CreateRevisionHandlerReturnType } from 'src/features/draft/commands/types/create-revision.handler.types';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

describe('CreateRevisionHandler', () => {
  it('should throw an error if there are no changes', async () => {
    const { organizationId, projectName, branchName, draftRevisionId } =
      await prepareProject(prismaService);
    await prismaService.revision.update({
      where: {
        id: draftRevisionId,
      },
      data: {
        hasChanges: false,
      },
    });

    const command = new CreateRevisionCommand({
      organizationId,
      projectName,
      branchName,
      comment: 'comment',
    });

    await expect(runTransaction(command)).rejects.toThrow(BadRequestException);
    await expect(runTransaction(command)).rejects.toThrow(
      'There are no changes',
    );
  });

  it('should throw an error if the project does not exist in the organization', async () => {
    const ids = await prepareProject(prismaService);
    const { organizationId, projectName, branchName } = ids;
    await prepareRevision(ids);

    shareTransactionalQueries.findProjectInOrganizationOrThrow = createMock(
      new Error('Project not found'),
    );

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

    shareTransactionalQueries.findBranchInProjectOrThrow = createMock(
      new Error('Branch not found'),
    );

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
    await prismaService.revision.update({
      where: {
        id: draftRevisionId,
      },
      data: {
        hasChanges: true,
      },
    });
    await prepareRevision(ids);
    await beforeTableRowChecks(ids);
    await beforeEndpointsChecks(ids);

    const command = new CreateRevisionCommand({
      organizationId,
      projectName,
      branchName,
      comment: 'comment',
    });
    const result = await runTransaction(command);

    expect(result.headEndpoints).toEqual([headEndpointId]);
    expect(result.draftEndpoints).toEqual([draftEndpointId]);
    await checkRevisions({
      headRevisionId,
      draftRevisionId,
      nextDraftRevisionId: result.nextDraftRevisionId,
    });
    await afterTableRowChecks(ids, result.nextDraftRevisionId);
    await afterEndpointsChecks(ids, result.nextDraftRevisionId);
  });

  async function beforeEndpointsChecks(ids: PrepareProjectReturnType) {
    const { headRevisionId, draftRevisionId, headEndpointId, draftEndpointId } =
      ids;

    expect(
      (
        await prismaService.endpoint.findUniqueOrThrow({
          where: { id: headEndpointId },
        })
      ).revisionId,
    ).toEqual(headRevisionId);

    expect(
      (
        await prismaService.endpoint.findUniqueOrThrow({
          where: { id: draftEndpointId },
        })
      ).revisionId,
    ).toEqual(draftRevisionId);
  }

  async function afterEndpointsChecks(
    ids: PrepareProjectReturnType,
    nextDraftRevisionId: string,
  ) {
    const { draftRevisionId, headEndpointId, draftEndpointId } = ids;

    expect(
      (
        await prismaService.endpoint.findUniqueOrThrow({
          where: { id: headEndpointId },
        })
      ).revisionId,
    ).toEqual(draftRevisionId);

    expect(
      (
        await prismaService.endpoint.findUniqueOrThrow({
          where: { id: draftEndpointId },
        })
      ).revisionId,
    ).toEqual(nextDraftRevisionId);
  }

  async function prepareRevision(ids: PrepareProjectReturnType) {
    await prismaService.revision.update({
      where: { id: ids.draftRevisionId },
      data: { hasChanges: true },
    });
  }

  async function beforeTableRowChecks(ids: PrepareProjectReturnType) {
    const {
      headTableVersionId,
      draftTableVersionId,
      headRowVersionId,
      draftRowVersionId,
    } = ids;

    // table
    expect(
      (
        await prismaService.table.findUniqueOrThrow({
          where: { versionId: headTableVersionId },
        })
      ).readonly,
    ).toEqual(true);

    expect(
      (
        await prismaService.table.findUniqueOrThrow({
          where: { versionId: draftTableVersionId },
        })
      ).readonly,
    ).toEqual(false);

    // row
    expect(
      (
        await prismaService.row.findUniqueOrThrow({
          where: { versionId: headRowVersionId },
        })
      ).readonly,
    ).toEqual(true);

    expect(
      (
        await prismaService.row.findUniqueOrThrow({
          where: { versionId: draftRowVersionId },
        })
      ).readonly,
    ).toEqual(false);
  }

  async function afterTableRowChecks(
    ids: PrepareProjectReturnType,
    nextDraftRevisionId: string,
  ) {
    const {
      tableId,
      headTableVersionId,
      draftTableVersionId,
      rowId,
      headRowVersionId,
      draftRowVersionId,
    } = ids;

    // table
    expect(
      (
        await prismaService.table.findUniqueOrThrow({
          where: { versionId: headTableVersionId },
        })
      ).readonly,
    ).toEqual(true);

    expect(
      (
        await prismaService.table.findUniqueOrThrow({
          where: { versionId: draftTableVersionId },
        })
      ).readonly,
    ).toEqual(true);

    const tableInNextDraftRevision =
      await prismaService.table.findUniqueOrThrow({
        where: {
          versionId: draftTableVersionId,
          revisions: {
            some: {
              id: nextDraftRevisionId,
            },
          },
        },
      });
    expect(tableInNextDraftRevision.readonly).toEqual(true);
    expect(tableInNextDraftRevision.id).toEqual(tableId);

    // row
    expect(
      (
        await prismaService.row.findUniqueOrThrow({
          where: { versionId: headRowVersionId },
        })
      ).readonly,
    ).toEqual(true);

    expect(
      (
        await prismaService.row.findUniqueOrThrow({
          where: { versionId: draftRowVersionId },
        })
      ).readonly,
    ).toEqual(true);

    const rowInNextDraftRevision = await prismaService.row.findUniqueOrThrow({
      where: {
        versionId: draftRowVersionId,
        tables: {
          some: {
            versionId: draftTableVersionId,
          },
        },
      },
    });
    expect(rowInNextDraftRevision.readonly).toEqual(true);
    expect(rowInNextDraftRevision.id).toEqual(rowId);
  }

  async function checkRevisions({
    headRevisionId,
    draftRevisionId,
    nextDraftRevisionId,
  }: {
    headRevisionId: string;
    draftRevisionId: string;
    nextDraftRevisionId: string;
  }) {
    // previous head
    const headRevision = await prismaService.revision.findUniqueOrThrow({
      where: { id: headRevisionId },
    });
    expect(headRevision.isHead).toBeFalsy();
    expect(headRevision.isDraft).toBeFalsy();
    expect(headRevision.hasChanges).toBe(false);

    // previous draft
    const draftRevision = await prismaService.revision.findUniqueOrThrow({
      where: { id: draftRevisionId },
    });
    expect(draftRevision.isDraft).toBeFalsy();
    expect(draftRevision.isHead).toBeTruthy();
    expect(draftRevision.hasChanges).toBe(false);

    // next draft
    const nextDraftRevision = await prismaService.revision.findFirstOrThrow({
      where: { parentId: draftRevisionId },
    });
    expect(nextDraftRevisionId).toEqual(nextDraftRevision.id);
    expect(nextDraftRevision.isHead).toBeFalsy();
    expect(nextDraftRevision.isDraft).toBeTruthy();
    expect(nextDraftRevision.parentId).toEqual(draftRevisionId);
    expect(nextDraftRevision.hasChanges).toEqual(false);
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;
  let shareTransactionalQueries: ShareTransactionalQueries;

  function runTransaction(
    command: CreateRevisionCommand,
  ): Promise<CreateRevisionHandlerReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  beforeEach(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
    shareTransactionalQueries = result.shareTransactionalQueries;
  });

  afterEach(async () => {
    prismaService.$disconnect();
  });
});
