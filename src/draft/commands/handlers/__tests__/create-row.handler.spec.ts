import { Prisma } from '@prisma/client';
import { createMocks } from 'src/__tests__/utils/createMocks';
import { implementIdService } from 'src/__tests__/utils/implementIdService';
import { createRowMocks } from 'src/__tests__/utils/rowMocks';
import { CreateRowHandler } from 'src/draft/commands/handlers/create-row.handler';
import { CreateRowInput } from 'src/graphql-api/draft/input';
import { FindTableInRevisionType } from 'src/share/queries/types';

xdescribe('CreateRowHandler', () => {
  let mocks: ReturnType<typeof createMocks>;
  let rowMocks: ReturnType<typeof createRowMocks>;
  let data: CreateRowInput;

  const TABLE_ID = 'tableId';
  const NEW_TABLE_ID = 'newTableId';
  const ROW_ID = 'rowId';

  beforeEach(() => {
    mocks = createMocks();
    rowMocks = createRowMocks();

    data = {
      revisionId: 'revisionId',
      tableId: 'tableId',
      rowId: 'rowId',
      data: { value: 1 },
    };

    implementIdService(mocks.idService, [ROW_ID]);
  });

  describe('Input validations', () => {
    it('should reject when rowId is shorter than 1 characters', async () => {
      data.rowId = 't';

      await expect(callHandler()).rejects.toThrow(
        'The length of the row name must be greater than or equal to 1',
      );
    });
  });

  describe('Database interactions', () => {
    it('should reject if a similar row already exists', async () => {
      mockFindTableInRevisionOrThrow({
        versionId: TABLE_ID,
        readonly: false,
        system: false,
      });
      mockGetSimilarRow({});

      await expect(callHandler()).rejects.toThrow(
        'A row with this name already exists in the table',
      );
    });

    it('should use the current table if it is not readonly', async () => {
      mockFindTableInRevisionOrThrow({
        versionId: TABLE_ID,
        readonly: false,
        system: false,
      });
      mockCreateRow({ id: ROW_ID });

      await expect(callHandler()).resolves.toBe(ROW_ID);

      checkValidateDraftRevision();
      checkFindTableInRevisionOrThrow();
      checkCreateNextVersionTable(false);
      checkFindRow();
      checkCreateRow(TABLE_ID);
    });

    it('should create a new version of the table if it is readonly', async () => {
      mockFindTableInRevisionOrThrow({
        versionId: TABLE_ID,
        readonly: true,
        system: false,
      });
      mockCreateNextVersionTable(NEW_TABLE_ID);
      mockCreateRow({ id: ROW_ID });

      await expect(callHandler()).resolves.toBe(ROW_ID);

      checkValidateDraftRevision();
      checkFindTableInRevisionOrThrow();
      checkCreateNextVersionTable(true);
      checkFindRow();
      checkCreateRow(NEW_TABLE_ID);
    });
  });

  // Mock Functions for simulating database and service interactions
  function mockFindTableInRevisionOrThrow(value: FindTableInRevisionType) {
    const { shareTransactionalQueries } = mocks;

    shareTransactionalQueries.findTableInRevisionOrThrow.mockResolvedValue(
      value,
    );
  }

  function mockCreateNextVersionTable(value: string) {
    const { rowTransactionalCommands } = rowMocks;

    rowTransactionalCommands.getOrCreateDraftTable.mockResolvedValue(value);
  }

  function mockGetSimilarRow(
    value: Partial<Prisma.RowGetPayload<Prisma.RowDefaultArgs>>,
  ) {
    const { prisma } = mocks;

    prisma.row.findFirst.mockResolvedValue(
      value as Prisma.RowGetPayload<Prisma.RowDefaultArgs>,
    );
  }

  function mockCreateRow(
    value: Partial<Prisma.RowGetPayload<Prisma.RowCreateArgs>>,
  ) {
    const { prisma } = mocks;

    prisma.row.create.mockResolvedValue(
      value as Prisma.RowGetPayload<Prisma.RowCreateArgs>,
    );
  }

  function checkFindRow() {
    const { prisma } = mocks;
    expect(prisma.row.findFirst).nthCalledWith(1, {
      where: {
        name: data.rowId,
        tables: {
          some: {
            name: data.tableId,
            revisions: { some: { id: data.revisionId } },
          },
        },
      },
      select: { id: true },
    });
  }

  function checkCreateRow(tableId: string) {
    const { prisma } = mocks;
    expect(prisma.row.create).nthCalledWith(1, {
      data: {
        id: ROW_ID,
        name: data.rowId,
        readonly: false,
        tables: {
          connect: {
            id: tableId,
          },
        },
        data: data.data,
      },
      select: {
        id: true,
      },
    });
  }

  function checkValidateDraftRevision() {
    const { shareTransactionalCommands } = mocks;
    // @ts-expect-error
    expect(shareTransactionalCommands.resolveDraftRevision).nthCalledWith(
      1,
      data.revisionId,
    );
  }

  function checkFindTableInRevisionOrThrow() {
    const { shareTransactionalQueries } = mocks;
    expect(shareTransactionalQueries.findTableInRevisionOrThrow).nthCalledWith(
      1,
      data.revisionId,
      data.tableId,
    );
  }

  function checkCreateNextVersionTable(called: boolean) {
    const { rowTransactionalCommands } = rowMocks;

    if (called) {
      expect(rowTransactionalCommands.getOrCreateDraftTable).nthCalledWith(
        1,
        TABLE_ID,
        data.revisionId,
      );
    } else {
      expect(
        rowTransactionalCommands.getOrCreateDraftTable,
      ).not.toHaveBeenCalled();
    }
  }

  async function callHandler() {
    const {
      transactionPrisma,
      idService,
      shareTransactionalCommands,
      shareTransactionalQueries,
    } = mocks;

    const { rowTransactionalCommands } = rowMocks;

    // @ts-expect-error
    const handler = new CreateRowHandler(
      transactionPrisma,
      rowTransactionalCommands,
      shareTransactionalCommands,
      shareTransactionalQueries,
      idService,
    );

    return handler.execute({ data });
  }
});
