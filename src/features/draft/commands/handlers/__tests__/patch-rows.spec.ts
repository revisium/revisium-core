import { CommandBus } from '@nestjs/cqrs';
import hash from 'object-hash';
import { prepareProject, prepareRow } from 'src/__tests__/utils/prepareProject';
import {
  getArraySchema,
  getNumberSchema,
  getObjectSchema,
  getStringSchema,
} from '@revisium/schema-toolkit/mocks';
import {
  createTestingModule,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { PatchRowsCommand } from 'src/features/draft/commands/impl/patch-rows.command';
import { PatchRowsHandlerReturnType } from 'src/features/draft/commands/types/patch-rows.handler.types';
import { RowApiService } from 'src/features/row/row-api.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('PatchRowsHandler', () => {
  it('should throw an error if any data is invalid', async () => {
    const ids = await prepareProject(prismaService);
    const {
      draftRevisionId,
      tableId,
      rowId,
      headTableVersionId,
      draftTableVersionId,
    } = ids;

    const row2 = await prepareRow({
      prismaService,
      headTableVersionId,
      draftTableVersionId,
      data: { ver: 10 },
      dataDraft: { ver: 20 },
      schema: testSchema,
    });

    const command = new PatchRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rows: [
        { rowId, patches: [{ op: 'replace', path: 'ver', value: 100 }] },
        {
          rowId: row2.rowId,
          patches: [{ op: 'replace', path: 'ver', value: true }],
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow(/must be number/);
  });

  it('should throw an error if any path is invalid', async () => {
    const ids = await prepareProject(prismaService);
    const {
      draftRevisionId,
      tableId,
      rowId,
      headTableVersionId,
      draftTableVersionId,
    } = ids;

    const row2 = await prepareRow({
      prismaService,
      headTableVersionId,
      draftTableVersionId,
      data: { ver: 10 },
      dataDraft: { ver: 20 },
      schema: testSchema,
    });

    const command = new PatchRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rows: [
        { rowId, patches: [{ op: 'replace', path: 'ver', value: 100 }] },
        {
          rowId: row2.rowId,
          patches: [{ op: 'replace', path: 'invalid', value: 1 }],
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Path not found at segment "invalid"',
    );
  });

  it('should throw an error if any row does not exist', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId, rowId } = ids;

    const command = new PatchRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rows: [
        { rowId, patches: [{ op: 'replace', path: 'ver', value: 100 }] },
        {
          rowId: 'invalid',
          patches: [{ op: 'replace', path: 'ver', value: 1 }],
        },
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow('Rows not found');
  });

  it('should patch multiple rows if conditions are met', async () => {
    const ids = await prepareProject(prismaService);
    const {
      draftRevisionId,
      tableId,
      rowId,
      schemaRowVersionId,
      draftRowVersionId,
      headTableVersionId,
      draftTableVersionId,
    } = ids;

    const newSchema = getObjectSchema({
      str: getStringSchema(),
      num: getNumberSchema(),
      list: getArraySchema(getNumberSchema()),
    });

    await prismaService.row.update({
      where: { versionId: schemaRowVersionId },
      data: { data: newSchema, hash: hash(newSchema) },
    });

    await prismaService.row.update({
      where: { versionId: draftRowVersionId },
      data: {
        data: { str: 'str1', num: 1, list: [1, 2, 3] },
        schemaHash: hash(newSchema),
      },
    });

    const row2 = await prepareRow({
      prismaService,
      headTableVersionId,
      draftTableVersionId,
      data: { str: 'str2', num: 10, list: [10] },
      dataDraft: { str: 'str2', num: 10, list: [10] },
      schema: newSchema,
    });

    const command = new PatchRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rows: [
        {
          rowId,
          patches: [
            { op: 'replace', path: 'str', value: 'updated1' },
            { op: 'replace', path: 'num', value: 100 },
          ],
        },
        {
          rowId: row2.rowId,
          patches: [
            { op: 'replace', path: 'str', value: 'updated2' },
            { op: 'replace', path: 'list[0]', value: 999 },
          ],
        },
      ],
    });

    const result = await runTransaction(command);
    expect(result.patchedRows).toHaveLength(2);

    const updatedRow1 = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });
    const updatedRow2 = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId: row2.rowId,
    });

    expect(updatedRow1?.data).toStrictEqual({
      str: 'updated1',
      num: 100,
      list: [1, 2, 3],
    });
    expect(updatedRow2?.data).toStrictEqual({
      str: 'updated2',
      num: 10,
      list: [999],
    });
  });

  it('should patch a single row via bulk operation', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId, rowId } = ids;

    const command = new PatchRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      rows: [{ rowId, patches: [{ op: 'replace', path: 'ver', value: 999 }] }],
    });

    const result = await runTransaction(command);

    expect(result.patchedRows).toHaveLength(1);

    const row = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });
    expect(row?.data).toStrictEqual({ ver: 999 });
  });

  function runTransaction(
    command: PatchRowsCommand,
  ): Promise<PatchRowsHandlerReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;
  let rowApiService: RowApiService;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
    rowApiService = result.module.get<RowApiService>(RowApiService);
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
