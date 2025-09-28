import { Test } from '@nestjs/testing';
import { Row } from '@prisma/client';
import {
  JsonFilter,
  OrderByConditions,
  WhereConditions,
} from '@revisium/prisma-pg-json';
import { nanoid } from 'nanoid';
import {
  getRowsCountSql,
  getRowsSql,
} from 'src/features/row/utils/get-rows-sql';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('getRows', () => {
  it('#1', async () => {
    const where: WhereConditions = {
      data: {
        path: ['tags'],
        array_contains: 'admin',
      } as JsonFilter,
    };
    const orderBy: OrderByConditions[] = [
      {
        createdAt: 'asc',
      },
    ];

    const result = await prisma.$queryRaw<Row[]>(
      getRowsSql(tableVersionId, 10, 0, where, orderBy),
    );
    const count = await prisma.$queryRaw<[{ count: bigint }]>(
      getRowsCountSql(tableVersionId, where),
    );

    expect(result.length).toBe(3);
    expect(Number(count[0].count)).toBe(3);
  });

  it('#2', async () => {
    const where: WhereConditions = {
      data: {
        path: ['products', '*', 'price'],
        gt: 100,
      } as JsonFilter,
    };
    const orderBy: OrderByConditions[] = [
      {
        createdAt: 'asc',
      },
    ];

    const result = await prisma.$queryRaw<Row[]>(
      getRowsSql(tableVersionId, 10, 0, where, orderBy),
    );
    const count = await prisma.$queryRaw<[{ count: bigint }]>(
      getRowsCountSql(tableVersionId, where),
    );

    expect(result.length).toBe(4);
    expect(Number(count[0].count)).toBe(4);
  });

  it('#3', async () => {
    const where: WhereConditions = {
      data: {
        path: ['products', '*', 'relatedItems', '*', 'price'],
        equals: 19.99,
      } as JsonFilter,
    };
    const orderBy: OrderByConditions[] = [
      {
        createdAt: 'asc',
      },
    ];

    const result = await prisma.$queryRaw<Row[]>(
      getRowsSql(tableVersionId, 10, 0, where, orderBy),
    );
    const count = await prisma.$queryRaw<[{ count: bigint }]>(
      getRowsCountSql(tableVersionId, where),
    );

    expect(result.length).toBe(1);
    expect(Number(count[0].count)).toBe(1);
  });

  let prisma: PrismaService;
  let tableVersionId: string;
  let ids = { row1: '', row2: '', row3: '', row4: '', row5: '' };

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
    };

    const versionIds = {
      row1: nanoid(),
      row2: nanoid(),
      row3: nanoid(),
      row4: nanoid(),
      row5: nanoid(),
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
            tags: ['admin', 'moderator', 'express'],
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
});
