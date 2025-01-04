import { Prisma } from '@prisma/client';
import { createMocks } from 'src/__tests__/utils/createMocks';
import { FindRowInTableOrThrowHandler } from 'src/features/share/queries/handlers/transactional/find-row-in-table-or-throw.handler';

describe('FindRowInTableOrThrowHandler', () => {
  let mocks: ReturnType<typeof createMocks>;
  const tableId: string = 'tableId';
  const rowId: string = 'rowId';
  const rowVersionId: string = 'rowVersionId';

  beforeEach(() => {
    mocks = createMocks();
  });

  it('should reject if the specified row does not exist', async () => {
    mockGetRow(null);

    await expect(callHandler()).rejects.toThrow(
      'A row with this name does not exist in the revision',
    );
  });

  it('should return row', async () => {
    mockGetRow({ id: rowVersionId, readonly: true });

    await expect(callHandler()).resolves.toStrictEqual({
      id: rowVersionId,
      readonly: true,
    });

    checkGetRow();
  });

  // Mock Functions for simulating database and service interactions

  function mockGetRow(
    value: Partial<Prisma.RowGetPayload<Prisma.RowDefaultArgs>> | null,
  ) {
    const { prisma } = mocks;

    prisma.row.findFirst.mockResolvedValue(
      value as Prisma.RowGetPayload<Prisma.RowDefaultArgs>,
    );
  }

  function checkGetRow() {
    const { prisma } = mocks;
    expect(prisma.row.findFirst).nthCalledWith(1, {
      where: { id: rowId, tables: { some: { versionId: tableId } } },
      select: { versionId: true, readonly: true },
    });
  }

  async function callHandler() {
    const { transactionPrisma } = mocks;

    const handler = new FindRowInTableOrThrowHandler(transactionPrisma);

    return handler.execute({ data: { tableVersionId: tableId, rowId } });
  }
});
