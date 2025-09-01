import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { Prisma } from '@prisma/client';
import { generateGetRowsQuery } from '../where-generator';
import { WhereConditions } from '../types';

describe('getRows Direct SQL Tests', () => {
  let module: TestingModule;
  let prismaService: PrismaService;
  let pgClient: Client;
  let getRowsSQL: string;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    prismaService = module.get(PrismaService);
    pgClient = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await pgClient.connect();

    // Load SQL from file directly
    getRowsSQL = fs.readFileSync(
      path.join(__dirname, '../../../../prisma/sql/getRows.sql'),
      'utf-8',
    );

    // Remove comments and parameter definitions (first few lines)
    const sqlLines = getRowsSQL.split('\n');
    const selectIndex = sqlLines.findIndex((line) =>
      line.trim().startsWith('SELECT'),
    );
    getRowsSQL = sqlLines.slice(selectIndex).join('\n');
  });

  afterEach(async () => {
    await pgClient.end();
    await module.close();
  });

  describe('JSON Path Filter Tests with Dynamic SQL Generation', () => {
    it('should filter by JSON path equals using dynamic SQL generator', async () => {
      const { table } = await createTableWithJsonData();

      // Test Prisma query first
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            data: {
              path: ['name'],
              equals: 'Alice',
            },
          },
        });

      // Test our dynamic SQL generation
      const whereConditions = {
        data: {
          path: ['name'],
          equals: 'Alice',
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId, // tableId
        10, // take
        0, // skip
        whereConditions, // whereConditions
      );

      console.log('Generated SQL:', sql);
      console.log('Generated Params:', params);

      const sqlResult = await pgClient.query(sql, params);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should filter by JSON path string_contains using dynamic SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            data: {
              path: ['title'],
              string_contains: 'Developer',
            },
          },
        });

      // Test our dynamic SQL generation
      const whereConditions = {
        data: {
          path: ['title'],
          string_contains: 'Developer',
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      console.log('Generated SQL:', sql);
      console.log('Generated Params:', params);

      const sqlResult = await pgClient.query(sql, params);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should filter by JSON path string_contains with case-insensitive mode using direct SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Test Prisma query with case-insensitive mode
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            data: {
              path: ['title'],
              string_contains: 'developer', // lowercase to test case-insensitive
              mode: 'insensitive',
            },
          },
        });

      // Test our direct SQL
      const whereCondition = {
        data: {
          path: ['title'],
          string_contains: 'developer',
          mode: 'insensitive',
        },
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should filter by JSON path number comparison using direct SQL', async () => {
      const { table } = await createTableWithJsonData();
      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            data: {
              path: ['age'],
              gt: 30,
            },
          },
        });

      // Test our direct SQL
      const whereCondition = {
        data: {
          path: ['age'],
          gt: 30,
        },
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should handle combined JSON + boolean filters using direct SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            readonly: false,
            data: {
              path: ['category'],
              equals: 'admin',
            },
          },
        });

      // Test our direct SQL
      const whereCondition = {
        readonly: false,
        data: {
          path: ['category'],
          equals: 'admin',
        },
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should filter by JSON path string starts with using direct SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            data: {
              path: ['name'],
              string_starts_with: 'A',
            },
          },
        });

      // Test our direct SQL
      const whereCondition = {
        data: {
          path: ['name'],
          string_starts_with: 'A',
        },
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should filter by JSON path number less than using direct SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            data: {
              path: ['age'],
              lt: 30,
            },
          },
        });

      // Test our direct SQL
      const whereCondition = {
        data: {
          path: ['age'],
          lt: 30,
        },
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should filter by JSON path not equals using direct SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            data: {
              path: ['category'],
              not: 'admin',
            },
          },
        });

      // Test our direct SQL
      const whereCondition = {
        data: {
          path: ['category'],
          not: 'admin',
        },
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should filter by nested JSON path string equals using direct SQL', async () => {
      const { table } = await createTableWithNestedJsonData();

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            data: {
              path: ['user', 'name'],
              equals: 'Alice',
            },
          },
        });

      // Test our direct SQL
      const whereCondition = {
        data: {
          path: ['user', 'name'],
          equals: 'Alice',
        },
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should filter by deeply nested JSON path (3 levels) using direct SQL', async () => {
      const { table } = await createTableWithNestedJsonData();

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            data: {
              path: ['settings', 'notifications', 'email'],
              equals: true,
            },
          },
        });

      // Test our direct SQL
      const whereCondition = {
        data: {
          path: ['settings', 'notifications', 'email'],
          equals: true,
        },
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should filter by nested JSON path with string_contains and mode using direct SQL', async () => {
      const { table } = await createTableWithNestedJsonData();

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            data: {
              path: ['user', 'profile', 'role'],
              string_contains: 'ADMIN', // uppercase to test case-insensitive
              mode: 'insensitive',
            },
          },
        });

      // Test our direct SQL
      const whereCondition = {
        data: {
          path: ['user', 'profile', 'role'],
          string_contains: 'ADMIN',
          mode: 'insensitive',
        },
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should filter by nested JSON path number comparison using direct SQL', async () => {
      const { table } = await createTableWithNestedJsonData();

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            data: {
              path: ['user', 'profile', 'age'],
              gte: 30,
            },
          },
        });

      // Test our direct SQL
      const whereCondition = {
        data: {
          path: ['user', 'profile', 'age'],
          gte: 30,
        },
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });
  });

  describe('Logical Operators Tests with Dynamic SQL Generation', () => {
    it('should filter by AND operator using dynamic SQL', async () => {
      const { table } = await createTableWithStringData();

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            AND: [{ readonly: false }, { id: { startsWith: 'user-' } }],
          },
        });

      // Test our dynamic SQL generation
      const whereConditions = {
        AND: [{ readonly: false }, { id: { startsWith: 'user-' } }],
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      console.log('Generated SQL:', sql);
      console.log('Generated Params:', params);

      const sqlResult = await pgClient.query(sql, params);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should filter by OR operator using direct SQL', async () => {
      const { table } = await createTableWithStringData();

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            OR: [{ readonly: true }, { hash: { contains: 'abc' } }],
          },
        });

      // Test our direct SQL
      const whereCondition = {
        OR: [{ readonly: true }, { hash: { contains: 'abc' } }],
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should filter by NOT operator using direct SQL', async () => {
      const { table } = await createTableWithStringData();

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            NOT: { readonly: true },
          },
        });

      // Test our direct SQL
      const whereCondition = {
        NOT: { readonly: true },
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should filter by OR with JSON conditions using direct SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            OR: [
              { data: { path: ['name'], equals: 'Alice' } },
              { data: { path: ['age'], equals: 30 } },
            ],
          },
        });

      // Test our direct SQL
      const whereCondition = {
        OR: [
          { data: { path: ['name'], equals: 'Alice' } },
          { data: { path: ['age'], equals: 30 } },
        ],
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should handle complex nested logical operators with dynamic SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Complex nested condition: (data.category = 'admin' AND (readonly = false OR data.age > 30)) OR id startsWith 'json-test'
      const complexWhereConditions = {
        OR: [
          {
            AND: [
              { data: { path: ['category'], equals: 'admin' } },
              {
                OR: [{ readonly: false }, { data: { path: ['age'], gt: 30 } }],
              },
            ],
          },
          { id: { startsWith: 'json-test' } },
        ],
      };

      // Test Prisma query (this is complex - we'll simplify for comparison)
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            OR: [
              {
                AND: [
                  { data: { path: ['category'], equals: 'admin' } },
                  {
                    OR: [
                      { readonly: false },
                      { data: { path: ['age'], gt: 30 } },
                    ],
                  },
                ],
              },
              { id: { startsWith: 'json-test' } },
            ],
          },
        });

      // Test our dynamic SQL generation
      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        complexWhereConditions,
      );

      console.log('Complex Generated SQL:', sql);
      console.log('Complex Generated Params:', params);

      const sqlResult = await pgClient.query(sql, params);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should filter by JSON path in array using dynamic SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Test our dynamic SQL generation for IN operation
      const whereConditions: WhereConditions = {
        data: {
          path: ['category'],
          in: ['admin', 'user'],
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      console.log('JSON IN Generated SQL:', sql);
      console.log('JSON IN Generated Params:', params);

      const sqlResult = await pgClient.query(sql, params);

      // Verify results - should get rows with category = 'admin' or 'user'
      expect(sqlResult.rows.length).toBeGreaterThan(0);

      // Check that all returned rows have category in the expected values
      for (const row of sqlResult.rows) {
        const categoryValue = row.data?.category;
        expect(['admin', 'user']).toContain(categoryValue);
      }
    });

    it('should filter by JSON path not in array using dynamic SQL', async () => {
      const { table } = await createTableWithJsonData();

      // Test our dynamic SQL generation for NOT IN operation
      const whereConditions: WhereConditions = {
        data: {
          path: ['category'],
          notIn: ['guest'],
        },
      };

      const { sql, params } = generateGetRowsQuery(
        table.versionId,
        10,
        0,
        whereConditions,
      );

      console.log('JSON NOT IN Generated SQL:', sql);
      console.log('JSON NOT IN Generated Params:', params);

      const sqlResult = await pgClient.query(sql, params);

      // Should return rows where category is NOT 'guest'
      expect(sqlResult.rows.length).toBeGreaterThan(0);

      // Check that no returned rows have category = 'guest'
      for (const row of sqlResult.rows) {
        const categoryValue = row.data?.category;
        expect(categoryValue).not.toBe('guest');
      }
    });
  });

  describe('StringFilter Tests with Direct SQL', () => {
    it('should filter by createdId equals using direct SQL', async () => {
      const { table, rows } = await createTableWithStringData();

      const targetCreatedId = rows[0].createdId;

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            createdId: {
              equals: targetCreatedId,
            },
          },
        });

      // Test our direct SQL
      const whereCondition = {
        createdId: {
          equals: targetCreatedId,
        },
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should filter by id startsWith using direct SQL', async () => {
      const { table } = await createTableWithStringData();

      const prefix = 'user-';

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            id: {
              startsWith: prefix,
            },
          },
        });

      // Test our direct SQL
      const whereCondition = {
        id: {
          startsWith: prefix,
        },
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should filter by hash contains using direct SQL', async () => {
      const { table } = await createTableWithStringData();

      const substring = 'abc';

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            hash: {
              contains: substring,
            },
          },
        });

      // Test our direct SQL
      const whereCondition = {
        hash: {
          contains: substring,
        },
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should filter by schemaHash in array using direct SQL', async () => {
      const { table, rows } = await createTableWithStringData();

      const targetSchemaHashes = [rows[0].schemaHash, rows[2].schemaHash];

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            schemaHash: {
              in: targetSchemaHashes,
            },
          },
        });

      // Test our direct SQL
      const whereCondition = {
        schemaHash: {
          in: targetSchemaHashes,
        },
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should handle combined string filters using direct SQL', async () => {
      const { table } = await createTableWithStringData();

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            id: {
              startsWith: 'user-',
            },
            hash: {
              contains: 'abc',
            },
            readonly: false,
          },
        });

      // Test our direct SQL
      const whereCondition = {
        id: {
          startsWith: 'user-',
        },
        hash: {
          contains: 'abc',
        },
        readonly: false,
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should support case-insensitive mode for StringFilter using direct SQL', async () => {
      const { table } = await createTableWithStringDataCaseSensitive();

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            id: {
              contains: 'ALICE', // uppercase search for lowercase data
              mode: 'insensitive',
            },
          },
        });

      // Test our direct SQL
      const whereCondition = {
        id: {
          contains: 'ALICE',
          mode: 'insensitive',
        },
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should support full-text search for StringFilter using direct SQL', async () => {
      const { table } = await createTableWithStringDataForSearch();

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            id: {
              search: 'developer & manager',
            },
          },
        });

      // Test our direct SQL
      const whereCondition = {
        id: {
          search: 'developer & manager',
        },
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });
  });

  describe('Date Filter Tests with Direct SQL', () => {
    it('should filter by simple date value using direct SQL', async () => {
      const { table } = await createTableWithDateData();

      const targetDate = new Date('2025-08-31T08:00:00.000Z');

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            createdAt: targetDate, // Simple date syntax
          },
        });

      // Test our direct SQL
      const whereCondition = {
        createdAt: targetDate.toISOString(),
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should filter by date greater than using direct SQL', async () => {
      const { table } = await createTableWithDateData();

      const targetDate = new Date('2025-08-30T08:00:00.000Z');

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            createdAt: {
              gt: targetDate,
            },
          },
        });

      // Test our direct SQL
      const whereCondition = {
        createdAt: {
          gt: targetDate.toISOString(),
        },
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should filter by date range using direct SQL', async () => {
      const { table } = await createTableWithDateData();

      const startDate = new Date('2025-08-30T08:00:00.000Z');
      const endDate = new Date('2025-09-01T23:59:59.000Z');

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

      // Test our direct SQL
      const whereCondition = {
        createdAt: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });

    it('should filter by date in array using direct SQL', async () => {
      const { table } = await createTableWithDateData();

      const date1 = new Date('2025-08-31T08:00:00.000Z');
      const date2 = new Date('2025-09-01T08:00:00.000Z');

      // Test Prisma query
      const prismaResult = await prismaService.table
        .findUniqueOrThrow({ where: { versionId: table.versionId } })
        .rows({
          take: 10,
          skip: 0,
          orderBy: { createdAt: Prisma.SortOrder.desc },
          where: {
            createdAt: {
              in: [date1, date2],
            },
          },
        });

      // Test our direct SQL
      const whereCondition = {
        createdAt: {
          in: [date1.toISOString(), date2.toISOString()],
        },
      };

      const sqlResult = await pgClient.query(getRowsSQL, [
        table.versionId,
        10,
        0,
        JSON.stringify(whereCondition),
      ]);

      // Compare results
      expect(sqlResult.rows).toHaveLength(prismaResult.length);
      if (prismaResult.length > 0 && sqlResult.rows.length > 0) {
        expect(sqlResult.rows.map((r) => r.id).sort()).toEqual(
          prismaResult.map((r) => r.id).sort(),
        );
      }
    });
  });

  // Helper function to create table with case-sensitive string data
  async function createTableWithStringDataCaseSensitive() {
    const table = await createTable();

    // Create test rows with mixed case data
    const rowDataStrings = [
      { id: 'user-alice', name: 'Alice Johnson', readonly: false },
      { id: 'admin-ALICE', name: 'ALICE SMITH', readonly: true },
      { id: 'guest-alicia', name: 'Alicia Brown', readonly: false },
      { id: 'user-bob', name: 'Bob Wilson', readonly: true },
      { id: 'manager-charlie', name: 'Charlie Davis', readonly: false },
    ];

    const rows = [];
    for (let i = 0; i < rowDataStrings.length; i++) {
      const rowData = rowDataStrings[i];
      const row = await prismaService.row.create({
        data: {
          id: rowData.id,
          createdId: nanoid(),
          versionId: nanoid(),
          readonly: rowData.readonly,
          data: { name: rowData.name },
          meta: { index: i },
          hash: nanoid(),
          schemaHash: nanoid(),
          tables: {
            connect: { versionId: table.versionId },
          },
        },
      });
      rows.push(row);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    return { table, rows };
  }

  // Helper function to create table with full-text search data
  async function createTableWithStringDataForSearch() {
    const table = await createTable();

    // Create test rows with searchable text
    const rowDataStrings = [
      { id: 'senior-developer-john', title: 'Senior Developer' },
      { id: 'project-manager-jane', title: 'Project Manager' },
      { id: 'developer-intern-mike', title: 'Developer Intern' },
      { id: 'sales-manager-lisa', title: 'Sales Manager' },
      { id: 'lead-developer-sam', title: 'Lead Developer' },
    ];

    const rows = [];
    for (let i = 0; i < rowDataStrings.length; i++) {
      const rowData = rowDataStrings[i];
      const row = await prismaService.row.create({
        data: {
          id: rowData.id,
          createdId: nanoid(),
          versionId: nanoid(),
          readonly: false,
          data: { title: rowData.title },
          meta: { index: i },
          hash: nanoid(),
          schemaHash: nanoid(),
          tables: {
            connect: { versionId: table.versionId },
          },
        },
      });
      rows.push(row);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    return { table, rows };
  }

  // Helper function to create table with string data for testing StringFilter
  async function createTableWithStringData() {
    const table = await createTable();

    // Create test rows with specific string patterns
    const rowDataStrings = [
      {
        id: 'user-alice',
        createdId: 'created-alice-123',
        hash: 'hash-abc123def',
        schemaHash: 'schema-alice-v1',
        readonly: false,
      },
      {
        id: 'user-bob',
        createdId: 'created-bob-456',
        hash: 'hash-xyz789ghi',
        schemaHash: 'schema-bob-v2',
        readonly: true,
      },
      {
        id: 'admin-charlie',
        createdId: 'created-charlie-789',
        hash: 'hash-abc456jkl',
        schemaHash: 'schema-charlie-v1',
        readonly: false,
      },
      {
        id: 'user-david',
        createdId: 'created-david-101',
        hash: 'hash-mno123pqr',
        schemaHash: 'schema-david-v3',
        readonly: true,
      },
      {
        id: 'guest-eve',
        createdId: 'created-eve-202',
        hash: 'hash-abcXYZstu',
        schemaHash: 'schema-eve-v2',
        readonly: false,
      },
    ];

    const rows = [];
    for (let i = 0; i < rowDataStrings.length; i++) {
      const rowData = rowDataStrings[i];
      const row = await prismaService.row.create({
        data: {
          id: rowData.id,
          createdId: rowData.createdId,
          versionId: nanoid(),
          readonly: rowData.readonly,
          data: { name: `User ${i}`, type: rowData.id.split('-')[0] },
          meta: { index: i },
          hash: rowData.hash,
          schemaHash: rowData.schemaHash,
          tables: {
            connect: { versionId: table.versionId },
          },
        },
      });
      rows.push(row);
      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay for ordering
    }

    return { table, rows };
  }

  // Helper function to create table with date test data
  async function createTableWithDateData() {
    const table = await createTable();

    // Create rows with specific timestamps
    const timestamps = [
      new Date('2025-08-29T08:00:00.000Z'), // 3 days ago
      new Date('2025-08-30T08:00:00.000Z'), // 2 days ago
      new Date('2025-08-31T08:00:00.000Z'), // 1 day ago
      new Date('2025-09-01T08:00:00.000Z'), // today
    ];

    const rows = [];
    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i];
      const row = await prismaService.row.create({
        data: {
          id: `date-test-row-${i}`,
          createdId: nanoid(),
          versionId: nanoid(),
          readonly: false,
          createdAt: timestamp,
          updatedAt: timestamp,
          publishedAt: timestamp,
          data: { name: `User${i}`, index: i },
          meta: { timestamp: timestamp.toISOString() },
          hash: nanoid(),
          schemaHash: nanoid(),
          tables: {
            connect: { versionId: table.versionId },
          },
        },
      });
      rows.push(row);
      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay for ordering
    }

    return { table, rows };
  }

  // Helper function to create table with JSON data
  async function createTableWithJsonData() {
    const table = await createTable();

    // Create test rows with JSON data
    const rowData = [
      { name: 'Alice', age: 25, category: 'admin', title: 'Manager' },
      { name: 'Bob', age: 30, category: 'user', title: 'Developer' },
      {
        name: 'Charlie',
        age: 35,
        category: 'admin',
        title: 'Senior Developer',
      },
      { name: 'David', age: 28, category: 'user', title: 'Designer' },
      { name: 'Eve', age: 32, category: 'admin', title: 'Product Manager' },
    ];

    const rows = [];
    for (let i = 0; i < rowData.length; i++) {
      const row = await prismaService.row.create({
        data: {
          id: `json-test-row-${i}`,
          createdId: nanoid(),
          versionId: nanoid(),
          readonly: i % 2 === 0, // 0,2,4 are readonly
          data: rowData[i],
          meta: { index: i },
          hash: nanoid(),
          schemaHash: nanoid(),
          tables: {
            connect: { versionId: table.versionId },
          },
        },
      });
      rows.push(row);
    }

    return { table, rows };
  }

  async function createTableWithNestedJsonData() {
    const table = await createTable();

    // Create test rows with nested JSON data
    const rowData = [
      {
        user: { name: 'Alice', profile: { age: 25, role: 'admin' } },
        settings: { theme: 'dark', notifications: { email: true, sms: false } },
      },
      {
        user: { name: 'Bob', profile: { age: 30, role: 'user' } },
        settings: {
          theme: 'light',
          notifications: { email: false, sms: true },
        },
      },
      {
        user: { name: 'Charlie', profile: { age: 35, role: 'admin' } },
        settings: { theme: 'dark', notifications: { email: true, sms: true } },
      },
      {
        user: { name: 'David', profile: { age: 28, role: 'user' } },
        settings: {
          theme: 'light',
          notifications: { email: false, sms: false },
        },
      },
    ];

    const rows = [];
    for (let i = 0; i < rowData.length; i++) {
      const row = await prismaService.row.create({
        data: {
          id: `json-test-row-${i}`,
          createdId: nanoid(),
          versionId: nanoid(),
          readonly: i % 2 === 0, // 0,2,4 are readonly
          data: rowData[i],
          meta: { index: i },
          hash: nanoid(),
          schemaHash: nanoid(),
          tables: {
            connect: { versionId: table.versionId },
          },
        },
      });
      rows.push(row);
      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay for ordering
    }

    return { table, rows };
  }

  async function createTable() {
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

    return prismaService.table.create({
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
  }
});
