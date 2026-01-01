import { QueryBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import {
  createPreviousFile,
  prepareProject,
  prepareTableAndRowWithFile,
} from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { FileStatus } from 'src/features/plugin/file/consts';
import {
  GetRowQuery,
  GetRowQueryReturnType,
} from 'src/features/row/queries/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('getRow', () => {
  it('should return row by revisionId, tableId and rowId', async () => {
    const { draftRevisionId, tableId, draftRowVersionId } =
      await prepareProject(prismaService);

    const row = await prismaService.row.findUniqueOrThrow({
      where: { versionId: draftRowVersionId },
    });

    const result = await runTransaction(
      new GetRowQuery({
        revisionId: draftRevisionId,
        tableId,
        rowId: row.id,
      }),
    );

    expect(result).not.toBeNull();
    expect(result?.id).toEqual(row!.id);
    expect(result?.versionId).toEqual(draftRowVersionId);
    expect(result?.context.revisionId).toEqual(draftRevisionId);
    expect(result?.context.tableId).toEqual(tableId);
  });

  it('should return null for non-existent row', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const result = await runTransaction(
      new GetRowQuery({
        revisionId: draftRevisionId,
        tableId,
        rowId: 'non-existent-row-id',
      }),
    );

    expect(result).toBeNull();
  });

  it('should return null for non-existent table', async () => {
    const { draftRevisionId, draftRowVersionId } =
      await prepareProject(prismaService);

    const row = await prismaService.row.findUniqueOrThrow({
      where: { versionId: draftRowVersionId },
    });

    const result = await runTransaction(
      new GetRowQuery({
        revisionId: draftRevisionId,
        tableId: 'non-existent-table-id',
        rowId: row.id,
      }),
    );

    expect(result).toBeNull();
  });

  it('should return null for non-existent revision', async () => {
    const { tableId, draftRowVersionId } = await prepareProject(prismaService);

    const row = await prismaService.row.findUniqueOrThrow({
      where: { versionId: draftRowVersionId },
    });

    const result = await runTransaction(
      new GetRowQuery({
        revisionId: 'non-existent-revision-id',
        tableId,
        rowId: row.id,
      }),
    );

    expect(result).toBeNull();
  });

  it('should not return row from different revision', async () => {
    const { headRevisionId, draftRevisionId, draftTableVersionId, tableId } =
      await prepareProject(prismaService);

    const draftOnlyRowId = nanoid();
    await prismaService.row.create({
      data: {
        tables: { connect: { versionId: draftTableVersionId } },
        id: draftOnlyRowId,
        versionId: nanoid(),
        createdId: nanoid(),
        hash: '',
        schemaHash: '',
        data: { ver: 1 },
      },
    });

    const resultFromDraft = await runTransaction(
      new GetRowQuery({
        revisionId: draftRevisionId,
        tableId,
        rowId: draftOnlyRowId,
      }),
    );
    expect(resultFromDraft).not.toBeNull();

    const resultFromHead = await runTransaction(
      new GetRowQuery({
        revisionId: headRevisionId,
        tableId,
        rowId: draftOnlyRowId,
      }),
    );
    expect(resultFromHead).toBeNull();
  });

  it('should compute rows', async () => {
    const data = {
      file: {
        ...createPreviousFile(),
        status: FileStatus.uploaded,
        url: '',
      },
      files: [],
    };

    const { draftRevisionId, table, rowDraft } =
      await prepareTableAndRowWithFile(prismaService, data);

    const result = await runTransaction(
      new GetRowQuery({
        revisionId: draftRevisionId,
        tableId: table.tableId,
        rowId: rowDraft.id,
      }),
    );

    const resultData = result?.data as typeof data;

    expect(resultData.file.url).toBeTruthy();
  });

  it('should work within existing transaction', async () => {
    const { draftRevisionId, tableId, draftRowVersionId } =
      await prepareProject(prismaService);

    const row = await prismaService.row.findUnique({
      where: { versionId: draftRowVersionId },
    });

    const result = await transactionService.run(async () => {
      const innerResult = await queryBus.execute<
        GetRowQuery,
        GetRowQueryReturnType
      >(
        new GetRowQuery({
          revisionId: draftRevisionId,
          tableId,
          rowId: row!.id,
        }),
      );
      return innerResult;
    });

    expect(result).not.toBeNull();
    expect(result?.id).toEqual(row!.id);
  });

  function runTransaction(query: GetRowQuery): Promise<GetRowQueryReturnType> {
    return transactionService.run(async () => queryBus.execute(query));
  }

  let prismaService: PrismaService;
  let transactionService: TransactionPrismaService;
  let queryBus: QueryBus;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    transactionService = result.transactionService;
    queryBus = result.queryBus;
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
