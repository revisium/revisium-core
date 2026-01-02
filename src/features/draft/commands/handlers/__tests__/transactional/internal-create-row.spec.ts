import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import {
  InternalCreateRowCommand,
  InternalCreateRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-create-row.command';
import { RowApiService } from 'src/features/row/row-api.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createTestingModule,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import objectHash from 'object-hash';

describe('InternalCreateRowHandler', () => {
  it('should throw an error if the rowId is shorter than 1 character', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new InternalCreateRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId: '',
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
    });

    await expect(runTransaction(command)).rejects.toThrow(BadRequestException);
    await expect(runTransaction(command)).rejects.toThrow(
      'Row ID must be between 1 and 100 characters',
    );
  });

  it('should throw an error if the revision does not exist', async () => {
    await prepareProject(prismaService);

    const command = new InternalCreateRowCommand({
      revisionId: 'unreal',
      tableId: 'tableId',
      rowId: 'rowId',
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if a similar row already exists', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const command = new InternalCreateRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId: rowId,
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Rows already exist:',
    );
  });

  it('should create a new row if conditions are met', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new InternalCreateRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId: 'newRowId',
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
    });

    const result = await runTransaction(command);
    expect(result.rowVersionId).toBeTruthy();

    const row = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId: 'newRowId',
    });
    expect(row).not.toBeNull();
    expect(row?.id).toBe('newRowId');
    expect(row?.data).toStrictEqual({ ver: 3 });
  });

  it('should save the optional publishedAt field', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const publishedAtDate = new Date('2027-01-01T00:00:00.000Z');

    const command = new InternalCreateRowCommand({
      revisionId: draftRevisionId,
      tableId: tableId,
      rowId: 'newRowId',
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
      publishedAt: publishedAtDate.toISOString(),
    });

    const result = await runTransaction(command);
    expect(result.rowVersionId).toBeTruthy();

    const row = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId: 'newRowId',
    });
    expect(row).not.toBeNull();
    expect(row?.id).toBe('newRowId');
    expect(row?.data).toStrictEqual({ ver: 3 });
  });

  function runTransaction(
    command: InternalCreateRowCommand,
  ): Promise<InternalCreateRowCommandReturnType> {
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

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
