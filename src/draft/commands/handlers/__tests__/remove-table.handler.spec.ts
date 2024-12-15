import { Prisma } from '@prisma/client';
import { createMocks } from 'src/__tests__/utils/createMocks';
import { implementIdService } from 'src/__tests__/utils/implementIdService';
import { RemoveTableHandler } from 'src/draft/commands/handlers/remove-table.handler';
import { CreateTableInput } from 'src/graphql-api/draft/input/create-table.input';

xdescribe('RemoveTableHandler', () => {
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
    it('should reject if the specified revision does not exist', async () => {
      data.revisionId = 'unreal';

      await expect(callHandler()).rejects.toThrow('Revision not found');
    });

    it('should reject if a table with the specified name does not exist in the revision', async () => {
      data.tableId = 'unreal';

      mockGetRevision({ isDraft: true });

      await expect(callHandler()).rejects.toThrow(
        'A table with this name does not exist in the revision',
      );
    });
  });

  describe('Database interactions', () => {
    it('should reject if the revision is not a draft revision', async () => {
      mockGetRevision({ isDraft: false });

      await expect(callHandler()).rejects.toThrow(
        'The revision is not a draft',
      );
    });

    it('should disconnect the table if it is readonly', async () => {
      mockGetRevision({ isDraft: true, branch: { id: BRANCH_ID } });
      mockGetTable({ id: TABLE_ID, readonly: true });
      mockTableGroupbBy([]);

      await expect(callHandler()).resolves.toBe(true);

      checkDisconnectTableFromRevision();
      checkNotDeleteTable();
    });

    it('should remove the table if it is not readonly', async () => {
      mockGetRevision({ isDraft: true, branch: { id: BRANCH_ID } });
      mockGetTable({ id: TABLE_ID, readonly: false });
      mockTableGroupbBy([]);

      await expect(callHandler()).resolves.toBe(true);

      checkDeleteTable();
      checkNotUpdateTable();
    });

    it('should set touched to true if other non-readonly tables exists', async () => {
      mockGetRevision({ isDraft: true, branch: { id: BRANCH_ID } });
      mockGetTable({ id: TABLE_ID, readonly: false });
      mockTableGroupbBy([
        { _count: 0, readonly: true },
        { _count: 2, readonly: false },
      ]);

      await expect(callHandler()).resolves.toBe(true);

      checkTableCount();
      checkUpdateBranch(true);
    });

    it('should set touched to false if all other tables are readonly', async () => {
      mockGetRevision({ isDraft: true, branch: { id: BRANCH_ID } });
      mockGetTable({ id: TABLE_ID, readonly: false });
      mockTableGroupbBy([
        { _count: 2, readonly: true },
        { _count: 0, readonly: false },
      ]);

      await expect(callHandler()).resolves.toBe(true);

      checkTableCount();
      checkUpdateBranch(false);
    });
  });

  // Mock Functions for simulating database and service interactions
  function mockGetRevision(
    value: Partial<Prisma.RevisionGetPayload<Prisma.RevisionDefaultArgs>> & {
      branch?: Partial<Prisma.BranchGetPayload<Prisma.BranchDefaultArgs>>;
    },
  ) {
    const { prisma } = mocks;

    prisma.revision.findUnique.mockResolvedValue(
      value as Prisma.RevisionGetPayload<Prisma.RevisionDefaultArgs>,
    );
  }

  function mockGetTable(
    value: Partial<Prisma.TableGetPayload<Prisma.TableDefaultArgs>>,
  ) {
    const { prisma } = mocks;

    prisma.table.findFirst.mockResolvedValue(
      value as Prisma.TableGetPayload<Prisma.TableDefaultArgs>,
    );
  }

  function mockTableGroupbBy(value: { _count: number; readonly: boolean }[]) {
    const { prisma } = mocks;

    // @ts-ignore
    prisma.table.groupBy.mockResolvedValue(value);
  }

  // Utility Functions for test verification and setup
  function checkDisconnectTableFromRevision() {
    const { prisma } = mocks;
    expect(prisma.table.update).nthCalledWith(1, {
      where: { id: TABLE_ID },
      data: { revisions: { disconnect: { id: data.revisionId } } },
    });
  }

  function checkDeleteTable() {
    const { prisma } = mocks;
    expect(prisma.table.delete).nthCalledWith(1, { where: { id: TABLE_ID } });
  }

  function checkNotDeleteTable() {
    const { prisma } = mocks;
    expect(prisma.table.delete).toHaveBeenCalledTimes(0);
  }

  function checkNotUpdateTable() {
    const { prisma } = mocks;
    expect(prisma.table.update).toHaveBeenCalledTimes(0);
  }

  function checkTableCount() {
    const { prisma } = mocks;
    expect(prisma.table.groupBy).nthCalledWith(1, {
      where: { revisions: { some: { id: data.revisionId } } },
      by: 'readonly',
      _count: true,
    });
  }

  function checkUpdateBranch(desiredTouched: boolean) {
    const { prisma } = mocks;
    expect(prisma.branch.update).nthCalledWith(1, {
      where: { id: BRANCH_ID },
      data: { touched: desiredTouched },
    });
  }

  async function callHandler() {
    const {
      transactionPrisma,
      shareTransactionalCommands,
      shareTransactionalQueries,
    } = mocks;

    // @ts-expect-error
    const handler = new RemoveTableHandler(
      transactionPrisma,
      shareTransactionalCommands,
      shareTransactionalQueries,
    );

    return handler.execute({ data });
  }
});
