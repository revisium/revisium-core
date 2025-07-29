import { QueryBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import {
  createTestingModule,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import {
  GetMigrationsQuery,
  GetMigrationsQueryReturnType,
} from 'src/features/revision/queries/impl';
import { HistoryPatches } from 'src/features/share/queries/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { getMigrations } from '../get-migrations.handler';

describe('getMigrations', () => {
  const makePatch = (date: string): HistoryPatches => ({
    date: date,
    hash: `hash-${date}`,
    patches: [],
  });

  it('returns an empty array when input is empty', () => {
    expect(getMigrations([])).toEqual([]);
  });

  it('handles a single table with a single patch', () => {
    const input = [
      { tableId: 'user', patches: [makePatch('2021-01-01T00:00:00Z')] },
    ];
    const result = getMigrations(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      tableId: 'user',
      ...makePatch('2021-01-01T00:00:00Z'),
    });
  });

  it('flattens multiple patches from one table and sorts them by date', () => {
    const input = [
      {
        tableId: 'user',
        patches: [
          makePatch('2021-01-03T00:00:00Z'),
          makePatch('2021-01-01T00:00:00Z'),
          makePatch('2021-01-02T00:00:00Z'),
        ],
      },
    ];
    const result = getMigrations(input);
    expect(result.map((item) => item.date)).toEqual([
      '2021-01-01T00:00:00Z',
      '2021-01-02T00:00:00Z',
      '2021-01-03T00:00:00Z',
    ]);
    expect(result.every((item) => item.tableId === 'user')).toBe(true);
  });

  it('merges and sorts patches from different tables together by date', () => {
    const input = [
      {
        tableId: 'post',
        patches: [
          makePatch('2020-12-31T23:00:00Z'),
          makePatch('2021-01-01T01:00:00Z'),
        ],
      },
      {
        tableId: 'user',
        patches: [
          makePatch('2021-01-01T00:30:00Z'),
          makePatch('2021-01-01T02:00:00Z'),
        ],
      },
    ];
    const result = getMigrations(input);
    const dates = result.map((item) => item.date);
    expect(dates).toEqual([
      '2020-12-31T23:00:00Z',
      '2021-01-01T00:30:00Z',
      '2021-01-01T01:00:00Z',
      '2021-01-01T02:00:00Z',
    ]);
    expect(result.map((item) => item.tableId)).toEqual([
      'post',
      'user',
      'post',
      'user',
    ]);
  });

  it('maintains stable sort order for identical dates', () => {
    const sameDate = '2021-05-05T12:00:00Z';
    const input = [
      { tableId: 'user', patches: [makePatch(sameDate)] },
      { tableId: 'post', patches: [makePatch(sameDate)] },
    ];
    const result = getMigrations(input);
    expect(result.map((item) => item.tableId)).toEqual(['user', 'post']);
  });
});

describe('GetMigrationsHandler', () => {
  it('should get migrations', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const result = await runTransaction(
      new GetMigrationsQuery({
        revisionId: draftRevisionId,
      }),
    );

    expect(result).toHaveLength(1);
    expect(result[0].date).toBeTruthy();
    expect(result[0].hash).toBe('e0a4410e5785220b2c91dc1a0a6bc441c3c67586');
    expect(result[0].tableId).toBe(tableId);
    expect(result[0].patches).toStrictEqual([
      {
        op: 'add',
        path: '',
        value: testSchema,
      },
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
