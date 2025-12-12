import { CommandBus } from '@nestjs/cqrs';
import hash from 'object-hash';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import {
  getArraySchema,
  getBooleanSchema,
  getNumberSchema,
  getObjectSchema,
  getStringSchema,
} from '@revisium/schema-toolkit/mocks';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import {
  PatchRowCommand,
  PatchRowCommandReturnType,
} from 'src/features/draft/commands/impl/patch-row.command';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('PatchRowHandler', () => {
  it('should throw an error if the data is invalid', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId, rowId } = ids;

    const command = new PatchRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      patches: [
        {
          op: 'replace',
          path: 'ver',
          value: true,
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow(/must be number/);
  });

  it('should throw an error if the path is invalid', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId, rowId } = ids;

    const command = new PatchRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      patches: [
        {
          op: 'replace',
          path: 'test',
          value: true,
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Path not found at segment "test"',
    );
  });

  it('should throw an error if the row does not exist', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId } = ids;

    const command = new PatchRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId: 'invalid',
      patches: [
        {
          op: 'replace',
          path: 'test',
          value: true,
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow('Row not found');
  });

  it('should patch the row if conditions are met', async () => {
    const ids = await prepareProject(prismaService);
    const {
      draftRevisionId,
      tableId,
      rowId,
      draftTableVersionId,
      draftRowVersionId,
      schemaRowVersionId,
    } = ids;

    const newSchema = getObjectSchema({
      str: getStringSchema(),
      num: getNumberSchema(),
      bool: getBooleanSchema(),
      list: getArraySchema(
        getObjectSchema({
          nestedList: getArraySchema(getNumberSchema()),
          nestedField: getBooleanSchema(),
        }),
      ),
    });

    await prismaService.row.update({
      where: {
        versionId: schemaRowVersionId,
      },
      data: {
        data: newSchema,
        hash: hash(newSchema),
      },
    });

    await prismaService.row.update({
      where: {
        versionId: draftRowVersionId,
      },
      data: {
        data: {
          str: 'str',
          num: 1,
          bool: false,
          list: [
            {
              nestedList: [1, 2, 3],
              nestedField: false,
            },
            {
              nestedList: [10],
              nestedField: true,
            },
            {
              nestedList: [],
              nestedField: false,
            },
          ],
        },
        schemaHash: hash(newSchema),
      },
    });

    const command = new PatchRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      patches: [
        {
          op: 'replace',
          path: 'str',
          value: 'strNext',
        },
        {
          op: 'replace',
          path: 'num',
          value: 2,
        },
        {
          op: 'replace',
          path: 'bool',
          value: true,
        },
        {
          op: 'replace',
          path: 'list[0].nestedList[2]',
          value: 10,
        },
        {
          op: 'replace',
          path: 'list[1]',
          value: {
            nestedList: [100, 101],
            nestedField: true,
          },
        },
        {
          op: 'replace',
          path: 'list[2].nestedList',
          value: [50, 51],
        },
      ],
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).toBe(draftTableVersionId);
    expect(result.previousRowVersionId).toBe(draftRowVersionId);
    expect(result.rowVersionId).toBe(draftRowVersionId);

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
    expect(row.data).toStrictEqual({
      bool: true,
      list: [
        {
          nestedField: false,
          nestedList: [1, 2, 10],
        },
        {
          nestedField: true,
          nestedList: [100, 101],
        },
        {
          nestedField: false,
          nestedList: [50, 51],
        },
      ],
      num: 2,
      str: 'strNext',
    });
  });

  function runTransaction(
    command: PatchRowCommand,
  ): Promise<PatchRowCommandReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
