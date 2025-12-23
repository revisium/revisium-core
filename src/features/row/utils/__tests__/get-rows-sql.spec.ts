import { Test } from '@nestjs/testing';
import { Row } from 'src/__generated__/client';
import {
  JsonFilter,
  OrderByConditions,
  WhereConditionsTyped,
} from '@revisium/prisma-pg-json';
import { nanoid } from 'nanoid';
import {
  getRowsCountSql,
  getRowsSql,
} from 'src/features/row/utils/get-rows-sql';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('getRowsSql', () => {
  let prisma: PrismaService;
  let tableVersionId: string;
  let ids = { row1: '', row2: '', row3: '', row4: '', row5: '', row6: '' };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    prisma = module.get(PrismaService);
  });

  beforeAll(async () => {
    const table = await prisma.table.create({
      data: {
        id: nanoid(),
        versionId: nanoid(),
        createdId: nanoid(),
      },
    });

    tableVersionId = table.versionId;

    ids = {
      row1: nanoid(),
      row2: nanoid(),
      row3: nanoid(),
      row4: nanoid(),
      row5: nanoid(),
      row6: nanoid(),
    };

    const versionIds = {
      row1: nanoid(),
      row2: nanoid(),
      row3: nanoid(),
      row4: nanoid(),
      row5: nanoid(),
      row6: nanoid(),
    };

    await prisma.row.createMany({
      data: [
        {
          id: ids.row1,
          versionId: versionIds.row1,
          createdId: nanoid(),
          hash: '',
          schemaHash: '',
          meta: {},
          data: {
            priority: 10,
            tags: ['admin', 'user', 'typescript'],
            scores: [85, 90, 95],
            products: [
              {
                name: 'Product A',
                price: 99.99,
                tags: ['featured', 'new', 'bestseller'],
                relatedItems: [
                  {
                    id: 'rel-1',
                    name: 'Accessory A1',
                    price: 19.99,
                    tags: ['new', 'popular'],
                  },
                  {
                    id: 'rel-2',
                    name: 'Accessory A2',
                    price: 29.99,
                    tags: ['featured', 'sale'],
                  },
                ],
              },
            ],
            reviews: [
              {
                rating: 4.5,
                comment: 'Great!',
                keywords: ['excellent', 'perfect'],
              },
              {
                rating: 5.0,
                comment: 'Excellent!',
                keywords: ['excellent', 'perfect', 'amazing'],
              },
            ],
            nestedArrays: [['nested1', 'nested2']],
            mixedArray: [1, 'string', { key: 'value' }],
          },
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: ids.row2,
          versionId: versionIds.row2,
          createdId: nanoid(),
          hash: '',
          schemaHash: '',
          meta: {},
          data: {
            priority: 5,
            tags: ['user', 'react'],
            scores: [80, 85, 90],
            products: [
              {
                name: 'Product B',
                price: 149.99,
                tags: ['premium', 'featured'],
              },
            ],
          },
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
        {
          id: ids.row3,
          versionId: versionIds.row3,
          createdId: nanoid(),
          hash: '',
          schemaHash: '',
          meta: {},
          data: {
            priority: 12,
            tags: ['admin', 'moderator', 'express', 'user'],
            scores: [90, 95],
            products: [
              {
                name: 'Product C',
                price: 199.99,
                tags: ['premium', 'exclusive'],
              },
            ],
          },
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
        },
        {
          id: ids.row4,
          versionId: versionIds.row4,
          createdId: nanoid(),
          hash: '',
          schemaHash: '',
          meta: {},
          data: {
            priority: 6,
            tags: ['user', 'node'],
            scores: [75, 80, 85],
            products: [
              {
                name: 'Product D',
                price: 299.99,
                tags: ['budget', 'basic'],
              },
            ],
          },
          createdAt: new Date('2025-01-04T00:00:00.000Z'),
        },
        {
          id: ids.row5,
          versionId: versionIds.row5,
          createdId: nanoid(),
          hash: '',
          schemaHash: '',
          meta: {},
          data: {
            priority: 15,
            tags: ['admin', 'supervisor'],
            scores: [95, 100],
            products: [
              {
                name: 'Product E',
                price: 399.99,
                tags: ['budget', 'exclusive'],
              },
            ],
          },
          createdAt: new Date('2025-01-05T00:00:00.000Z'),
        },
        {
          id: ids.row6,
          versionId: versionIds.row6,
          createdId: nanoid(),
          hash: '',
          schemaHash: '',
          meta: {},
          data: {
            name: 'Defense of the Crystal Labyrinth',
            steps: [
              {
                items: [],
                npc_id: 'crystal_keeper',
                coordinates: { x: 640, y: 480 },
                description:
                  'Help the Crystal Keeper defend the labyrinth from attackers.',
                location_id: 'crystal_maze',
                step_number: 1,
                objective_type: 'defend',
              },
            ],
            preview: {
              url: '/4096ecadbfe7ef524b6949997e72027e175ad293',
              hash: '4096ecadbfe7ef524b6949997e72027e175ad293',
              size: 2045900,
              width: 1024,
              fileId: 'iVdfUzO-YJj4yy8ukt4xP',
              height: 1024,
              status: 'uploaded',
              fileName: '17_34_45.png',
              mimeType: 'image/png',
              extension: 'png',
            },
            rewards: {
              items: [{ item_id: 'crystal_armor', quantity: 1 }],
              currency: { gold: 200, silver: 100 },
              abilities: ['crystal_shield'],
              experience: 800,
            },
            description: 'Help defend the Crystal Labyrinth from enemies.',
            requirements: {
              required_items: [{ item_id: 'healing_potion', quantity: 2 }],
              required_level: 12,
              required_skills: ['blok_shhitom'],
              required_factions: [
                { faction_id: 'black_order', reputation: 'ally' },
              ],
            },
            is_repeatable: false,
            quest_type_id: 'escort_quest',
          },
          createdAt: new Date('2025-01-06T00:00:00.000Z'),
        },
      ],
    });

    for (const rowVersionId of Object.values(versionIds)) {
      await prisma.row.update({
        where: { versionId: rowVersionId },
        data: {
          tables: {
            connect: {
              versionId: tableVersionId,
            },
          },
        },
      });
    }
  });

  describe('Filtering', () => {
    it('should filter by array_contains on tags', async () => {
      const where: WhereConditionsTyped<{ data: 'json' }> = {
        data: {
          path: ['tags'],
          array_contains: ['user', 'admin'],
        } as JsonFilter,
      };
      const orderBy: OrderByConditions[] = [{ createdAt: 'asc' }];

      const result = await prisma.$queryRaw<Row[]>(
        getRowsSql(tableVersionId, 10, 0, where, orderBy),
      );
      const count = await prisma.$queryRaw<[{ count: bigint }]>(
        getRowsCountSql(tableVersionId, where),
      );

      expect(result.length).toBe(2);
      expect(Number(count[0].count)).toBe(2);
      expect(result.map((r) => r.id)).toEqual([ids.row1, ids.row3]);
    });

    it('should filter by wildcard path with numeric comparison', async () => {
      const where: WhereConditionsTyped<{ data: 'json' }> = {
        data: {
          path: ['products', '*', 'price'],
          gt: 100,
        } as JsonFilter,
      };
      const orderBy: OrderByConditions[] = [{ createdAt: 'asc' }];

      const result = await prisma.$queryRaw<Row[]>(
        getRowsSql(tableVersionId, 10, 0, where, orderBy),
      );
      const count = await prisma.$queryRaw<[{ count: bigint }]>(
        getRowsCountSql(tableVersionId, where),
      );

      expect(result.length).toBe(4);
      expect(Number(count[0].count)).toBe(4);
      expect(result.map((r) => r.id)).toEqual([
        ids.row2,
        ids.row3,
        ids.row4,
        ids.row5,
      ]);
    });

    it('should filter by nested wildcard path with equals', async () => {
      const where: WhereConditionsTyped<{ data: 'json' }> = {
        data: {
          path: ['products', '*', 'relatedItems', '*', 'price'],
          equals: 19.99,
        } as JsonFilter,
      };
      const orderBy: OrderByConditions[] = [{ createdAt: 'asc' }];

      const result = await prisma.$queryRaw<Row[]>(
        getRowsSql(tableVersionId, 10, 0, where, orderBy),
      );
      const count = await prisma.$queryRaw<[{ count: bigint }]>(
        getRowsCountSql(tableVersionId, where),
      );

      expect(result.length).toBe(1);
      expect(Number(count[0].count)).toBe(1);
      expect(result[0].id).toBe(ids.row1);
    });

    it('should filter by AND condition with nested wildcard', async () => {
      const where: WhereConditionsTyped<{ data: 'json' }> = {
        AND: [
          {
            data: {
              path: ['steps', '*', 'coordinates', 'y'],
              equals: 480,
            } as JsonFilter,
          },
        ],
      };
      const orderBy: OrderByConditions[] = [{ createdAt: 'asc' }];

      const result = await prisma.$queryRaw<Row[]>(
        getRowsSql(tableVersionId, 10, 0, where, orderBy),
      );
      const count = await prisma.$queryRaw<[{ count: bigint }]>(
        getRowsCountSql(tableVersionId, where),
      );

      expect(result.length).toBe(1);
      expect(Number(count[0].count)).toBe(1);
      expect(result[0].id).toBe(ids.row6);
    });
  });

  describe('Pagination', () => {
    it('should return first page with limit 2', async () => {
      const orderBy: OrderByConditions[] = [{ createdAt: 'asc' }];

      const result = await prisma.$queryRaw<Row[]>(
        getRowsSql(tableVersionId, 2, 0, {}, orderBy),
      );

      expect(result.length).toBe(2);
      expect(result.map((r) => r.id)).toEqual([ids.row1, ids.row2]);
    });

    it('should return second page with limit 2 and offset 2', async () => {
      const orderBy: OrderByConditions[] = [{ createdAt: 'asc' }];

      const result = await prisma.$queryRaw<Row[]>(
        getRowsSql(tableVersionId, 2, 2, {}, orderBy),
      );

      expect(result.length).toBe(2);
      expect(result.map((r) => r.id)).toEqual([ids.row3, ids.row4]);
    });

    it('should return third page with limit 2 and offset 4', async () => {
      const orderBy: OrderByConditions[] = [{ createdAt: 'asc' }];

      const result = await prisma.$queryRaw<Row[]>(
        getRowsSql(tableVersionId, 2, 4, {}, orderBy),
      );

      expect(result.length).toBe(2);
      expect(result.map((r) => r.id)).toEqual([ids.row5, ids.row6]);
    });

    it('should return last page when offset exceeds data', async () => {
      const orderBy: OrderByConditions[] = [{ createdAt: 'asc' }];

      const result = await prisma.$queryRaw<Row[]>(
        getRowsSql(tableVersionId, 2, 10, {}, orderBy),
      );

      expect(result.length).toBe(0);
    });

    it('should paginate filtered results', async () => {
      const where: WhereConditionsTyped<{ data: 'json' }> = {
        data: {
          path: ['tags'],
          array_contains: ['admin'],
        } as JsonFilter,
      };
      const orderBy: OrderByConditions[] = [{ createdAt: 'asc' }];

      const page1 = await prisma.$queryRaw<Row[]>(
        getRowsSql(tableVersionId, 2, 0, where, orderBy),
      );
      const page2 = await prisma.$queryRaw<Row[]>(
        getRowsSql(tableVersionId, 2, 2, where, orderBy),
      );

      expect(page1.length).toBe(2);
      expect(page1.map((r) => r.id)).toEqual([ids.row1, ids.row3]);
      expect(page2.length).toBe(1);
      expect(page2.map((r) => r.id)).toEqual([ids.row5]);
    });
  });

  describe('Count', () => {
    it('should count all rows without filter', async () => {
      const count = await prisma.$queryRaw<[{ count: bigint }]>(
        getRowsCountSql(tableVersionId, {}),
      );

      expect(Number(count[0].count)).toBe(6);
    });

    it('should count filtered rows', async () => {
      const where: WhereConditionsTyped<{ data: 'json' }> = {
        data: {
          path: ['tags'],
          array_contains: ['user'],
        } as JsonFilter,
      };

      const count = await prisma.$queryRaw<[{ count: bigint }]>(
        getRowsCountSql(tableVersionId, where),
      );

      expect(Number(count[0].count)).toBe(4);
    });

    it('should count with complex filter', async () => {
      const where: WhereConditionsTyped<{ data: 'json' }> = {
        AND: [
          {
            data: {
              path: ['priority'],
              gt: 10,
            } as JsonFilter,
          },
        ],
      };

      const count = await prisma.$queryRaw<[{ count: bigint }]>(
        getRowsCountSql(tableVersionId, where),
      );

      expect(Number(count[0].count)).toBe(2);
    });
  });

  describe('Search', () => {
    it('should search with searchType plain (default)', async () => {
      const where: WhereConditionsTyped<{ data: 'json' }> = {
        data: {
          path: [],
          search: 'Crystal Labyrinth',
          searchLanguage: 'simple',
          searchType: 'plain',
        } as JsonFilter,
      };
      const orderBy: OrderByConditions[] = [{ createdAt: 'asc' }];

      const result = await prisma.$queryRaw<Row[]>(
        getRowsSql(tableVersionId, 10, 0, where, orderBy),
      );

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(ids.row6);
    });

    it('should search with searchType phrase', async () => {
      const where: WhereConditionsTyped<{ data: 'json' }> = {
        data: {
          path: [],
          search: 'Crystal Labyrinth',
          searchLanguage: 'simple',
          searchType: 'phrase',
        } as JsonFilter,
      };
      const orderBy: OrderByConditions[] = [{ createdAt: 'asc' }];

      const result = await prisma.$queryRaw<Row[]>(
        getRowsSql(tableVersionId, 10, 0, where, orderBy),
      );

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(ids.row6);
    });

    it('should search with searchType prefix for partial words', async () => {
      const where: WhereConditionsTyped<{ data: 'json' }> = {
        data: {
          path: [],
          search: 'Cryst Laby',
          searchLanguage: 'simple',
          searchType: 'prefix',
        } as JsonFilter,
      };
      const orderBy: OrderByConditions[] = [{ createdAt: 'asc' }];

      const result = await prisma.$queryRaw<Row[]>(
        getRowsSql(tableVersionId, 10, 0, where, orderBy),
      );

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(ids.row6);
    });

    it('should search with searchType prefix for single partial word', async () => {
      const where: WhereConditionsTyped<{ data: 'json' }> = {
        data: {
          path: [],
          search: 'blok',
          searchLanguage: 'simple',
          searchType: 'prefix',
        } as JsonFilter,
      };
      const orderBy: OrderByConditions[] = [{ createdAt: 'asc' }];

      const result = await prisma.$queryRaw<Row[]>(
        getRowsSql(tableVersionId, 10, 0, where, orderBy),
      );

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(ids.row6);
    });

    it('should search with searchType tsquery using AND operator', async () => {
      const where: WhereConditionsTyped<{ data: 'json' }> = {
        data: {
          path: [],
          search: 'Crystal & Labyrinth',
          searchLanguage: 'simple',
          searchType: 'tsquery',
        } as JsonFilter,
      };
      const orderBy: OrderByConditions[] = [{ createdAt: 'asc' }];

      const result = await prisma.$queryRaw<Row[]>(
        getRowsSql(tableVersionId, 10, 0, where, orderBy),
      );

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(ids.row6);
    });

    it('should search with searchType tsquery using OR operator', async () => {
      const where: WhereConditionsTyped<{ data: 'json' }> = {
        data: {
          path: [],
          search: 'Crystal | typescript',
          searchLanguage: 'simple',
          searchType: 'tsquery',
        } as JsonFilter,
      };
      const orderBy: OrderByConditions[] = [{ createdAt: 'asc' }];

      const result = await prisma.$queryRaw<Row[]>(
        getRowsSql(tableVersionId, 10, 0, where, orderBy),
      );

      expect(result.length).toBe(2);
      expect(result.map((r) => r.id)).toEqual([ids.row1, ids.row6]);
    });

    it('should search with searchType tsquery using NOT operator', async () => {
      const where: WhereConditionsTyped<{ data: 'json' }> = {
        data: {
          path: [],
          search: 'admin & !supervisor',
          searchLanguage: 'simple',
          searchType: 'tsquery',
        } as JsonFilter,
      };
      const orderBy: OrderByConditions[] = [{ createdAt: 'asc' }];

      const result = await prisma.$queryRaw<Row[]>(
        getRowsSql(tableVersionId, 10, 0, where, orderBy),
      );

      expect(result.length).toBe(2);
      expect(result.map((r) => r.id)).toEqual([ids.row1, ids.row3]);
    });

    it('should search with searchType tsquery using prefix operator', async () => {
      const where: WhereConditionsTyped<{ data: 'json' }> = {
        data: {
          path: [],
          search: 'Cryst:* & Laby:*',
          searchLanguage: 'simple',
          searchType: 'tsquery',
        } as JsonFilter,
      };
      const orderBy: OrderByConditions[] = [{ createdAt: 'asc' }];

      const result = await prisma.$queryRaw<Row[]>(
        getRowsSql(tableVersionId, 10, 0, where, orderBy),
      );

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(ids.row6);
    });

    it('should not find with prefix search when word does not start with query', async () => {
      const where: WhereConditionsTyped<{ data: 'json' }> = {
        data: {
          path: [],
          search: 'ystal',
          searchLanguage: 'simple',
          searchType: 'prefix',
        } as JsonFilter,
      };
      const orderBy: OrderByConditions[] = [{ createdAt: 'asc' }];

      const result = await prisma.$queryRaw<Row[]>(
        getRowsSql(tableVersionId, 10, 0, where, orderBy),
      );

      expect(result.length).toBe(0);
    });
  });
});
