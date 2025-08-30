import { QueryBus } from '@nestjs/cqrs';
import {
  createPreviousFile,
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
