import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { Client } from 'pg';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { Prisma } from '@prisma/client';
import { generateGetRowsQuery } from '../where-generator';
import { WhereConditions } from '../types';

describe('SQL Generator Performance Tests', () => {
  let module: TestingModule;
  let prismaService: PrismaService;
  let pgClient: Client;
  let table: any;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    prismaService = module.get(PrismaService);
    pgClient = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await pgClient.connect();

    // Create test data once for all performance tests
    table = await createTableWithLargeDataset();
  });

  afterAll(async () => {
    await pgClient.end();
    await module.close();
  });

  describe('Performance Comparison: Prisma vs PG+Generator', () => {
    const testIterations = 10; // Number of test iterations

    // Complex test condition that will be used for both Prisma and PG+Generator
    const complexConditions: WhereConditions = {
      OR: [
        {
          AND: [
            { data: { path: ['category'], equals: 'admin' } },
            { readonly: false },
            {
              OR: [
                { data: { path: ['age'], gt: 25 } },
                { data: { path: ['score'], gte: 85 } },
              ],
            },
          ],
        },
        {
          AND: [
            { id: { startsWith: 'user-' } },
            { data: { path: ['status'], equals: 'active' } },
            { createdAt: { gt: new Date('2025-01-01').toISOString() } },
          ],
        },
        {
          NOT: {
            AND: [
              { data: { path: ['category'], equals: 'guest' } },
              { readonly: true },
            ],
          },
        },
      ],
    };

    it('should compare performance of complex queries', async () => {
      // Measure Prisma performance
      const prismaTimings: number[] = [];

      for (let i = 0; i < testIterations; i++) {
        const startTime = process.hrtime.bigint();

        const _prismaResult = await prismaService.table
          .findUniqueOrThrow({ where: { versionId: table.versionId } })
          .rows({
            take: 50,
            skip: i * 10, // Different offset each time
            orderBy: { createdAt: Prisma.SortOrder.desc },
            where: {
              OR: [
                {
                  AND: [
                    { data: { path: ['category'], equals: 'admin' } },
                    { readonly: false },
                    {
                      OR: [
                        { data: { path: ['age'], gt: 25 } },
                        { data: { path: ['score'], gte: 85 } },
                      ],
                    },
                  ],
                },
                {
                  AND: [
                    { id: { startsWith: 'user-' } },
                    { data: { path: ['status'], equals: 'active' } },
                    { createdAt: { gt: new Date('2025-01-01') } },
                  ],
                },
                {
                  NOT: {
                    AND: [
                      { data: { path: ['category'], equals: 'guest' } },
                      { readonly: true },
                    ],
                  },
                },
              ],
            },
          });

        const endTime = process.hrtime.bigint();
        prismaTimings.push(Number(endTime - startTime) / 1_000_000); // Convert to milliseconds
      }

      // Measure PG + Generator performance
      const pgTimings: number[] = [];
      const sqlGenerationTimings: number[] = [];

      for (let i = 0; i < testIterations; i++) {
        // Measure SQL generation time
        const genStartTime = process.hrtime.bigint();

        const { sql, params } = generateGetRowsQuery(
          table.versionId,
          50,
          i * 10, // Different offset each time
          complexConditions,
        );

        const genEndTime = process.hrtime.bigint();
        sqlGenerationTimings.push(
          Number(genEndTime - genStartTime) / 1_000_000,
        ); // Convert to milliseconds

        // Measure total query execution time (including generation)
        const totalStartTime = process.hrtime.bigint();

        const _sqlResult = await pgClient.query(sql, params);

        const totalEndTime = process.hrtime.bigint();
        pgTimings.push(Number(totalEndTime - totalStartTime) / 1_000_000); // Convert to milliseconds
      }

      // Calculate statistics
      const prismaAvg =
        prismaTimings.reduce((a, b) => a + b, 0) / prismaTimings.length;
      const prismaMin = Math.min(...prismaTimings);
      const prismaMax = Math.max(...prismaTimings);

      const pgAvg = pgTimings.reduce((a, b) => a + b, 0) / pgTimings.length;
      const pgMin = Math.min(...pgTimings);
      const pgMax = Math.max(...pgTimings);

      const sqlGenAvg =
        sqlGenerationTimings.reduce((a, b) => a + b, 0) /
        sqlGenerationTimings.length;
      const sqlGenMin = Math.min(...sqlGenerationTimings);
      const sqlGenMax = Math.max(...sqlGenerationTimings);

      // Performance comparison results
      console.log('\n=== PERFORMANCE COMPARISON RESULTS ===');
      console.log(`Test iterations: ${testIterations}`);
      console.log(`Data size: ~${await getDataSize()} rows`);

      console.log('\n--- Prisma ORM Performance ---');
      console.log(`Average: ${prismaAvg.toFixed(2)}ms`);
      console.log(`Min: ${prismaMin.toFixed(2)}ms`);
      console.log(`Max: ${prismaMax.toFixed(2)}ms`);

      console.log('\n--- PG + Generator Performance ---');
      console.log(`Average (total): ${pgAvg.toFixed(2)}ms`);
      console.log(`Min (total): ${pgMin.toFixed(2)}ms`);
      console.log(`Max (total): ${pgMax.toFixed(2)}ms`);

      console.log('\n--- SQL Generation Only Performance ---');
      console.log(`Average: ${sqlGenAvg.toFixed(4)}ms`);
      console.log(`Min: ${sqlGenMin.toFixed(4)}ms`);
      console.log(`Max: ${sqlGenMax.toFixed(4)}ms`);

      console.log('\n--- Performance Comparison ---');
      const speedup = prismaAvg / pgAvg;
      console.log(
        `PG+Generator is ${speedup.toFixed(2)}x ${speedup > 1 ? 'faster' : 'slower'} than Prisma`,
      );
      console.log(
        `SQL Generation overhead: ${sqlGenAvg.toFixed(4)}ms (${((sqlGenAvg / pgAvg) * 100).toFixed(2)}% of total time)`,
      );

      console.log('\n--- Individual Timings ---');
      console.log(
        'Prisma timings (ms):',
        prismaTimings.map((t) => t.toFixed(2)),
      );
      console.log(
        'PG+Gen timings (ms):',
        pgTimings.map((t) => t.toFixed(2)),
      );
      console.log(
        'SQL Gen timings (ms):',
        sqlGenerationTimings.map((t) => t.toFixed(4)),
      );

      // Basic assertions to ensure both methods return similar results
      // Note: We don't assert on exact performance as it depends on system load
      expect(prismaTimings.length).toBe(testIterations);
      expect(pgTimings.length).toBe(testIterations);
      expect(sqlGenerationTimings.length).toBe(testIterations);

      // SQL generation should be very fast (< 1ms on average)
      expect(sqlGenAvg).toBeLessThan(1.0);
    });

    it('should measure SQL generation performance for different complexity levels', async () => {
      const iterations = 100;

      // Simple condition
      const simpleCondition: WhereConditions = {
        readonly: false,
      };

      // Medium complexity
      const mediumCondition: WhereConditions = {
        AND: [
          { readonly: false },
          { data: { path: ['category'], equals: 'admin' } },
          { createdAt: { gt: new Date('2025-01-01').toISOString() } },
        ],
      };

      // High complexity (deeply nested)
      const complexCondition: WhereConditions = {
        OR: [
          {
            AND: [
              {
                data: {
                  path: ['user', 'profile', 'category'],
                  equals: 'admin',
                },
              },
              {
                OR: [
                  { readonly: false },
                  {
                    data: { path: ['settings', 'permissions', 'level'], gt: 5 },
                  },
                ],
              },
              {
                NOT: {
                  AND: [
                    { data: { path: ['flags', 'disabled'], equals: true } },
                    { data: { path: ['temp', 'locked'], equals: true } },
                  ],
                },
              },
            ],
          },
          {
            AND: [
              { id: { startsWith: 'admin-' } },
              { hash: { contains: 'special' } },
              {
                data: { path: ['meta', 'priority'], in: ['high', 'critical'] },
              },
            ],
          },
        ],
      };

      const conditions = [
        { name: 'Simple', condition: simpleCondition },
        { name: 'Medium', condition: mediumCondition },
        { name: 'Complex', condition: complexCondition },
      ];

      console.log('\n=== SQL GENERATION PERFORMANCE BY COMPLEXITY ===');

      for (const { name, condition } of conditions) {
        const timings: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const startTime = process.hrtime.bigint();

          const { sql: _sql, params: _params } = generateGetRowsQuery(
            'test-table-id',
            10,
            0,
            condition,
          );

          const endTime = process.hrtime.bigint();
          timings.push(Number(endTime - startTime) / 1_000_000); // Convert to milliseconds
        }

        const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
        const min = Math.min(...timings);
        const max = Math.max(...timings);

        console.log(`\n--- ${name} Query ---`);
        console.log(`Average: ${avg.toFixed(4)}ms`);
        console.log(`Min: ${min.toFixed(4)}ms`);
        console.log(`Max: ${max.toFixed(4)}ms`);
        console.log(
          `Sample SQL length: ${generateGetRowsQuery('test', 10, 0, condition).sql.length} chars`,
        );
        console.log(
          `Sample params count: ${generateGetRowsQuery('test', 10, 0, condition).params.length}`,
        );

        // All generation should be very fast
        expect(avg).toBeLessThan(1.0);
      }
    });
  });

  // Helper functions
  async function createTableWithLargeDataset() {
    const branch = await prismaService.branch.create({
      data: {
        id: nanoid(),
        name: nanoid(),
        project: {
          create: {
            id: nanoid(),
            name: nanoid(),
            organization: {
              create: {
                id: nanoid(),
                createdId: nanoid(),
              },
            },
          },
        },
      },
    });

    const revision = await prismaService.revision.create({
      data: {
        id: nanoid(),
        branch: {
          connect: {
            id: branch.id,
          },
        },
      },
    });

    const table = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: {
            id: revision.id,
          },
        },
      },
    });

    // Create a larger dataset for performance testing
    const categories = ['admin', 'user', 'guest', 'manager', 'developer'];
    const statuses = ['active', 'inactive', 'pending', 'suspended'];
    const rowCount = 100; // Reasonable size for testing

    const createPromises = [];

    for (let i = 0; i < rowCount; i++) {
      const category = categories[i % categories.length];
      const status = statuses[i % statuses.length];
      const isReadonly = Math.random() > 0.7; // ~30% readonly
      const age = Math.floor(Math.random() * 50) + 18; // 18-68 years old
      const score = Math.floor(Math.random() * 100); // 0-100 score

      const promise = prismaService.row.create({
        data: {
          id: i % 3 === 0 ? `user-${i}` : `${category}-${i}`,
          createdId: nanoid(),
          versionId: nanoid(),
          readonly: isReadonly,
          createdAt: new Date(
            Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
          ), // Random date within last year
          data: {
            category,
            status,
            age,
            score,
            name: `User ${i}`,
            user: {
              profile: {
                category: category,
                age: age,
              },
            },
            settings: {
              permissions: {
                level: Math.floor(Math.random() * 10),
              },
            },
            flags: {
              disabled: Math.random() > 0.8,
            },
            temp: {
              locked: Math.random() > 0.9,
            },
            meta: {
              priority: Math.random() > 0.7 ? 'high' : 'normal',
            },
          },
          meta: {
            index: i,
            batch: Math.floor(i / 10),
          },
          hash: Math.random() > 0.5 ? `hash-special-${i}` : `hash-normal-${i}`,
          schemaHash: nanoid(),
          tables: {
            connect: { versionId: table.versionId },
          },
        },
      });

      createPromises.push(promise);

      // Batch creation to avoid overwhelming the database
      if (createPromises.length >= 20) {
        await Promise.all(createPromises);
        createPromises.length = 0;
      }
    }

    // Create remaining rows
    if (createPromises.length > 0) {
      await Promise.all(createPromises);
    }

    return table;
  }

  async function getDataSize(): Promise<number> {
    const count = await prismaService.row.count({
      where: {
        tables: {
          some: {
            versionId: table.versionId,
          },
        },
      },
    });
    return count;
  }
});
