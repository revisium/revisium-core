import { Prisma } from '@prisma/client';
import { createMocks } from 'src/__tests__/utils/createMocks';
import { FindTableInRevisionOrThrowHandler } from 'src/features/share/queries/handlers/transactional/find-table-in-revision-or-throw.handler';

describe('FindTableInRevisionOrThrowHandler', () => {
  let mocks: ReturnType<typeof createMocks>;
  const revisionId: string = 'revisionId';
  const tableId: string = 'tableId';
  const tableVersionId: string = 'tableVersionId';

  beforeEach(() => {
    mocks = createMocks();
  });

  it('should reject if the specified table does not exist', async () => {
    mockGetTable(null);

    await expect(callHandler()).rejects.toThrow(
      'A table with this name does not exist in the revision',
    );
  });

  xit('should return table', async () => {
    mockGetTable({ id: tableVersionId, readonly: true });

    await expect(callHandler()).resolves.toStrictEqual({
      id: tableVersionId,
      readonly: true,
    });

    checkGetTable();
  });

  // Mock Functions for simulating database and service interactions

  function mockGetTable(
    value: Partial<Prisma.TableGetPayload<Prisma.TableDefaultArgs>> | null,
  ) {
    const { prisma } = mocks;

    prisma.table.findFirst.mockResolvedValue(
      value as Prisma.TableGetPayload<Prisma.TableDefaultArgs>,
    );
  }

  function checkGetTable() {
    const { prisma } = mocks;
    expect(prisma.table.findFirst).nthCalledWith(1, {
      where: {
        name: tableId,
        revisions: { some: { id: revisionId } },
      },
      select: { id: true, readonly: true },
    });
  }

  async function callHandler() {
    const { transactionPrisma } = mocks;

    const handler = new FindTableInRevisionOrThrowHandler(transactionPrisma);

    return handler.execute({ data: { revisionId, tableId } });
  }
});
