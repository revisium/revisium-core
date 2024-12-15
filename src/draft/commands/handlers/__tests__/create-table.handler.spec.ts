import { Prisma } from '@prisma/client';
import { createMocks } from 'src/__tests__/utils/createMocks';
import { implementIdService } from 'src/__tests__/utils/implementIdService';
import { CreateTableHandler } from 'src/draft/commands/handlers/create-table.handler';
import { CreateTableInput } from 'src/graphql-api/draft/input/create-table.input';

xdescribe('CreateTableHandler', () => {
  let mocks: ReturnType<typeof createMocks>;
  let data: CreateTableInput;

  const TABLE_ID = 'tableId';
  const BRANCH_ID = 'branchId';

  beforeEach(() => {
    mocks = createMocks();

    data = { revisionId: 'revisionId', tableId: 'table', schema: {} };

    implementIdService(mocks.idService, [TABLE_ID]);
  });

  describe('Input validations', () => {
    it('should reject when tableId is shorter than 1 characters', async () => {
      data.tableId = 't';

      await expect(callHandler()).rejects.toThrow(
        'The length of the table name must be greater than or equal to 1',
      );
    });

    it('should reject if the specified revision does not exist', async () => {
      data.revisionId = 'unreal';

      await expect(callHandler()).rejects.toThrow('Revision not found');
    });
  });

  describe('Database interactions', () => {
    it('should reject if the revision is not a draft revision', async () => {
      mockGetRevision({ isDraft: false });

      await expect(callHandler()).rejects.toThrow(
        'The revision is not a draft',
      );
    });

    it('should reject if a similar table already exists', async () => {
      mockGetRevision({ isDraft: true });
      mockGetSimilarTable({});

      await expect(callHandler()).rejects.toThrow(
        'A table with this name already exists in the revision',
      );
    });

    it('should return table ID and mark branch as touched when conditions are met', async () => {
      mockGetRevision({ isDraft: true });
      mockCreateTable({ id: TABLE_ID });
      mockGetBranch({ id: BRANCH_ID });

      await expect(callHandler()).resolves.toBe(TABLE_ID);

      checkTouchBranch();
      checkCreateTable();
    });

    it('should return table ID without touching the branch if it has already touched', async () => {
      mockGetRevision({ isDraft: true });
      mockCreateTable({ id: TABLE_ID });

      await expect(callHandler()).resolves.toBe(TABLE_ID);

      checkNotTouchBranch();
      checkCreateTable();
    });
  });

  // Mock Functions for simulating database and service interactions
  function mockGetRevision(
    value: Partial<Prisma.RevisionGetPayload<Prisma.RevisionDefaultArgs>>,
  ) {
    const { prisma } = mocks;

    prisma.revision.findUnique.mockResolvedValue(
      value as Prisma.RevisionGetPayload<Prisma.RevisionDefaultArgs>,
    );
  }

  function mockGetSimilarTable(
    value: Partial<Prisma.TableGetPayload<Prisma.TableDefaultArgs>>,
  ) {
    const { prisma } = mocks;

    prisma.table.findFirst.mockResolvedValue(
      value as Prisma.TableGetPayload<Prisma.TableDefaultArgs>,
    );
  }

  function mockCreateTable(
    value: Partial<Prisma.TableGetPayload<Prisma.TableCreateArgs>>,
  ) {
    const { prisma } = mocks;

    prisma.table.create.mockResolvedValue(
      value as Prisma.TableGetPayload<Prisma.TableCreateArgs>,
    );
  }

  function mockGetBranch(
    value: Partial<Prisma.BranchGetPayload<Prisma.BranchFindFirstArgs>>,
  ) {
    const { prisma } = mocks;

    prisma.branch.findFirst.mockResolvedValue(
      value as Prisma.BranchGetPayload<Prisma.BranchFindFirstArgs>,
    );
  }

  // Utility Functions for test verification and setup
  function checkCreateTable() {
    const { prisma } = mocks;
    expect(prisma.table.create).nthCalledWith(1, {
      data: {
        id: TABLE_ID,
        name: data.tableId,
        readonly: false,
        revisions: {
          connect: {
            id: data.revisionId,
          },
        },
      },
      select: {
        id: true,
      },
    });
  }

  function checkTouchBranch() {
    const { prisma } = mocks;
    expect(prisma.branch.update).nthCalledWith(1, {
      where: { id: BRANCH_ID },
      data: { touched: true },
    });
  }

  function checkNotTouchBranch() {
    const { prisma } = mocks;
    expect(prisma.branch.update).toHaveBeenCalledTimes(0);
  }

  async function callHandler() {
    const { transactionPrisma, idService, shareTransactionalCommands } = mocks;

    // @ts-expect-error
    const handler = new CreateTableHandler(
      transactionPrisma,
      shareTransactionalCommands,
      idService,
    );

    return handler.execute({ data });
  }
});
