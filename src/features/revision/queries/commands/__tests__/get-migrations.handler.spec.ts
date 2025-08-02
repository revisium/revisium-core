import { QueryBus } from '@nestjs/cqrs';
import * as objectHash from 'object-hash';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import {
  createTestingModule,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import {
  GetMigrationsQuery,
  GetMigrationsQueryReturnType,
} from 'src/features/revision/queries/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('GetMigrationsHandler', () => {
  it('should get migrations', async () => {
    const { draftRevisionId } = await prepareProject(prismaService);

    const result = await runTransaction(
      new GetMigrationsQuery({
        revisionId: draftRevisionId,
      }),
    );

    expect(result).toStrictEqual([
      [
        {
          date: expect.any(String),
          hash: objectHash(testSchema),
          patches: [
            {
              op: 'add',
              path: '',
              value: testSchema,
            },
          ],
        },
      ],
    ]);
  });

  function runTransaction(
    query: GetMigrationsQuery,
  ): Promise<GetMigrationsQueryReturnType> {
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
