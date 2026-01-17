import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import {
  createPreviousFile,
  prepareProject,
  prepareTableAndRowWithFile,
} from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { FileStatus } from 'src/features/plugin/file/consts';
import { FormulaService } from 'src/features/plugin/formula';
import { CreateTableCommand } from 'src/features/draft/commands/impl/create-table.command';
import { ApiCreateRowCommand } from 'src/features/draft/commands/impl/api-create-row.command';
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

  describe('formula computation', () => {
    beforeEach(() => {
      Object.defineProperty(formulaService, 'isAvailable', { value: true });
    });

    it('should compute formula and return computed value in data', async () => {
      const { draftRevisionId } = await prepareProject(prismaService);

      await transactionService.run(async () =>
        commandBus.execute(
          new CreateTableCommand({
            revisionId: draftRevisionId,
            tableId: 'products',
            schema: {
              type: 'object',
              properties: {
                price: { type: 'number', default: 0 },
                quantity: { type: 'number', default: 1 },
                total: {
                  type: 'number',
                  default: 0,
                  readOnly: true,
                  'x-formula': { version: 1, expression: 'price * quantity' },
                },
              },
              additionalProperties: false,
              required: ['price', 'quantity', 'total'],
            },
          }),
        ),
      );

      await commandBus.execute(
        new ApiCreateRowCommand({
          revisionId: draftRevisionId,
          tableId: 'products',
          rowId: 'row1',
          data: { price: 100, quantity: 5, total: 0 },
        }),
      );

      const result = await runTransaction(
        new GetRowQuery({
          revisionId: draftRevisionId,
          tableId: 'products',
          rowId: 'row1',
        }),
      );

      expect(result).not.toBeNull();
      expect(result?.formulaErrors).toBeUndefined();
      const data = result?.data as {
        price: number;
        quantity: number;
        total: number;
      };
      expect(data.total).toBe(500);
    });

    it('should return formulaErrors when formula fails', async () => {
      const { draftRevisionId } = await prepareProject(prismaService);

      await transactionService.run(async () =>
        commandBus.execute(
          new CreateTableCommand({
            revisionId: draftRevisionId,
            tableId: 'products',
            schema: {
              type: 'object',
              properties: {
                price: { type: 'number', default: 0 },
                quantity: { type: 'number', default: 1 },
                total: {
                  type: 'number',
                  default: 0,
                  readOnly: true,
                  'x-formula': { version: 1, expression: 'price * quantity' },
                },
                settings: {
                  type: 'object',
                  properties: {
                    display: {
                      type: 'object',
                      properties: {
                        scale: { type: 'number', default: 1 },
                      },
                      additionalProperties: false,
                      required: ['scale'],
                    },
                  },
                  additionalProperties: false,
                  required: [],
                },
                scaled: {
                  type: 'number',
                  default: -1,
                  readOnly: true,
                  'x-formula': {
                    version: 1,
                    expression: 'settings.display.scale',
                  },
                },
              },
              additionalProperties: false,
              required: ['price', 'quantity', 'total', 'settings', 'scaled'],
            },
          }),
        ),
      );

      await commandBus.execute(
        new ApiCreateRowCommand({
          revisionId: draftRevisionId,
          tableId: 'products',
          rowId: 'row1',
          data: {
            price: 100,
            quantity: 5,
            total: 0,
            settings: {},
            scaled: -1,
          },
        }),
      );

      const result = await runTransaction(
        new GetRowQuery({
          revisionId: draftRevisionId,
          tableId: 'products',
          rowId: 'row1',
        }),
      );

      expect(result).not.toBeNull();
      const resultData = result?.data as {
        price: number;
        quantity: number;
        total: number;
        scaled: number;
      };
      expect(resultData.total).toBe(500);
      expect(resultData.scaled).toBe(0);

      expect(result?.formulaErrors).toBeDefined();
      expect(result?.formulaErrors).toHaveLength(1);
      expect(result?.formulaErrors?.[0].field).toBe('scaled');
      expect(result?.formulaErrors?.[0].expression).toBe(
        'settings.display.scale',
      );
      expect(result?.formulaErrors?.[0].defaultUsed).toBe(true);
    });
  });

  function runTransaction(query: GetRowQuery): Promise<GetRowQueryReturnType> {
    return transactionService.run(async () => queryBus.execute(query));
  }

  let prismaService: PrismaService;
  let transactionService: TransactionPrismaService;
  let queryBus: QueryBus;
  let commandBus: CommandBus;
  let formulaService: FormulaService;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    transactionService = result.transactionService;
    queryBus = result.queryBus;
    commandBus = result.commandBus;
    formulaService = result.module.get<FormulaService>(FormulaService);
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
