import { CommandBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import {
  InternalUpdateRowCommand,
  InternalUpdateRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-update-row.command';
import { RowApiService } from 'src/features/row/row-api.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createTestingModule,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import objectHash from 'object-hash';

describe('InternalUpdateRowHandler', () => {
  it('should throw an error if the revision does not exist', async () => {
    const { tableId, rowId } = await prepareProject(prismaService);

    const command = new InternalUpdateRowCommand({
      revisionId: 'unreal',
      tableId,
      rowId,
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if the row does not exist', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new InternalUpdateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId: 'unrealRow',
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Row "unrealRow" not found in table',
    );
  });

  it('should update the row if conditions are met', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const command = new InternalUpdateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      data: { ver: 3 },
      schemaHash: objectHash(testSchema),
    });

    const result = await runTransaction(command);
    expect(result.rowVersionId).toBeTruthy();

    const row = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });
    expect(row).not.toBeNull();
    expect(row?.data).toStrictEqual({ ver: 3 });
  });

  it('should update the publishedAt field', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const newPublishedAt = '2025-09-22T05:59:51.079Z';

    const command = new InternalUpdateRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
      data: { ver: 3 },
      publishedAt: newPublishedAt,
      schemaHash: objectHash(testSchema),
    });

    const result = await runTransaction(command);
    expect(result.rowVersionId).toBeTruthy();

    const row = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });
    expect(row).not.toBeNull();
    expect(row?.data).toStrictEqual({ ver: 3 });
  });

  function runTransaction(
    command: InternalUpdateRowCommand,
  ): Promise<InternalUpdateRowCommandReturnType> {
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
