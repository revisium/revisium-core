import { createMocks } from 'src/__tests__/utils/createMocks';
import { implementIdService } from 'src/__tests__/utils/implementIdService';
import {
  CreateProjectHandler,
  CreateProjectHandlerContext,
} from 'src/features/project/commands/handlers/create-project.handler';

xdescribe('CreateProjectHandler', () => {
  let mocks: ReturnType<typeof createMocks>;

  let context: CreateProjectHandlerContext;

  beforeEach(() => {
    context = {
      organizationId: 'organizationId',
      projectId: 'projectId',
      projectName: 'projectName',
      branchId: 'branchId',
      headRevisionId: 'headRevisionId',
      headChangelogId: 'headChangelogId',
      draftRevisionId: 'draftRevisionId',
      draftChangelogId: 'draftChangelogId',
      schemaTableId: 'schemaTableId',
    };

    mocks = createMocks({ asyncLocalStorageStore: context });

    implementIdService(mocks.idService, [
      context.projectId,
      context.branchId,
      context.headRevisionId,
      context.draftRevisionId,
    ]);
  });

  it('should be default branchName', async () => {
    const result = await executeHandler();

    checkProject('master');
    checkHeadRevision();
    checkDraftRevision();

    expect(result).toBe(context.projectId);
  });

  it('should be implicitly defined branchName', async () => {
    context.branchName = 'custom_branch_name';

    await executeHandler();

    checkProject(context.branchName);
  });

  function checkProject(branchName: string) {
    const { prisma } = mocks;
    expect(prisma.project.create).toBeCalledWith({
      data: {
        id: context.projectId,
        name: context.projectName,
        branches: {
          create: {
            id: context.branchId,
            name: branchName,
            isRoot: true,
          },
        },
      },
    });
  }

  function checkHeadRevision() {
    const { prisma } = mocks;
    expect(prisma.revision.create).nthCalledWith(1, {
      data: {
        id: context.headRevisionId,
        isHead: true,
        branch: {
          connect: {
            id: context.branchId,
          },
        },
        changelog: {
          create: {
            id: context.headChangelogId,
          },
        },
      },
    });
  }

  function checkDraftRevision() {
    const { prisma } = mocks;
    expect(prisma.revision.create).nthCalledWith(2, {
      data: {
        id: context.draftRevisionId,
        isDraft: true,
        parent: {
          connect: {
            id: context.headRevisionId,
          },
        },
        branch: {
          connect: {
            id: context.branchId,
          },
        },
        changelog: {
          create: {
            id: context.draftChangelogId,
          },
        },
      },
    });
  }

  async function executeHandler() {
    const { idService, transactionPrisma, asyncLocalStorage } = mocks;

    const handler = new CreateProjectHandler(
      transactionPrisma,
      idService,
      asyncLocalStorage,
    );
    return handler.execute({
      data: {
        organizationId: context.organizationId,
        projectName: context.projectName,
        branchName: context.branchName,
      },
    });
  }
});
