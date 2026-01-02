import { CommandBus } from '@nestjs/cqrs';
import objectHash from 'object-hash';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { InternalUpdateRowsCommand } from 'src/features/draft/commands/impl/transactional/internal-update-rows.command';
import { RowApiService } from 'src/features/row/row-api.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createTestingModule,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';

describe('InternalUpdateRowsHandler', () => {
  it('should update the row if conditions are met', async () => {
    const { draftRevisionId, tableId, rowId } =
      await prepareProject(prismaService);

    const command = new InternalUpdateRowsCommand({
      revisionId: draftRevisionId,
      tableId,
      tableSchema: testSchema,
      schemaHash: objectHash(testSchema),
      rows: [
        {
          rowId,
          data: { ver: 3 },
        },
      ],
    });

    await runTransaction(command);

    const row = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });
    expect(row).not.toBeNull();
    expect(row?.data).toStrictEqual({ ver: 3 });
  });

  function runTransaction(command: InternalUpdateRowsCommand): Promise<void> {
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
