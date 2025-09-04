import { nanoid } from 'nanoid';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

export interface TestRow {
  id: string;
  data?: any;
  [key: string]: any;
}

export async function createTableWithJsonData(prismaService: PrismaService) {
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

  // Create test data with JSON content
  const testRows = [
    {
      id: 'json-test-1',
      data: {
        name: 'Alice',
        age: 35,
        title: 'Senior Developer',
        category: 'admin',
      },
      meta: {},
      readonly: false,
    },
    {
      id: 'json-test-2',
      data: {
        name: 'Bob',
        age: 25,
        title: 'Developer',
        category: 'user',
      },
      meta: {},
      readonly: true,
    },
    {
      id: 'json-test-3',
      data: {
        name: 'Charlie',
        age: 45,
        title: 'Manager',
        category: 'guest',
      },
      meta: {},
      readonly: false,
    },
    {
      id: 'json-test-4',
      data: {
        name: 'David',
        age: 30,
        title: 'Lead Developer',
        category: 'admin',
        tags: ['typescript', 'react'],
      },
      meta: {},
      readonly: false,
    },
    {
      id: 'json-test-5',
      data: {
        name: 'Eve',
        age: 28,
        title: 'UI Designer',
        category: 'user',
        user: {
          profile: {
            name: 'Eve Profile',
            age: 28,
            bio: 'Senior UI/UX Designer with expertise in modern web technologies',
            settings: {
              theme: 'dark',
            },
          },
        },
      },
      meta: {},
      readonly: true,
    },
  ];

  for (const rowData of testRows) {
    await prismaService.row.create({
      data: {
        id: rowData.id,
        createdId: nanoid(),
        versionId: nanoid(),
        readonly: rowData.readonly,
        data: rowData.data,
        meta: rowData.meta,
        hash: nanoid(),
        schemaHash: nanoid(),
        tables: {
          connect: { versionId: table.versionId },
        },
      },
    });
  }

  return { table };
}

export async function createTableWithStringData(prismaService: PrismaService) {
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

  // Create test data with various string patterns
  const testRows = [
    {
      id: 'user-1',
      createdId: 'created-alpha',
      hash: 'hash-special-123',
      schemaHash: 'schema-SPECIAL-456',
      data: { category: 'admin' },
    },
    {
      id: 'user-2',
      createdId: 'created-beta',
      hash: 'hash-normal-789',
      schemaHash: 'schema-normal-012',
      data: { category: 'user' },
    },
    {
      id: 'admin-1',
      createdId: 'created-gamma',
      hash: 'hash-SPECIAL-345',
      schemaHash: 'schema-test-678',
      data: { category: 'admin' },
    },
  ];

  for (const rowData of testRows) {
    await prismaService.row.create({
      data: {
        id: rowData.id,
        createdId: rowData.createdId,
        versionId: nanoid(),
        readonly: false,
        data: rowData.data,
        meta: {},
        hash: rowData.hash,
        schemaHash: rowData.schemaHash,
        tables: {
          connect: { versionId: table.versionId },
        },
      },
    });
  }

  return { table };
}

export async function createTableWithDateData(prismaService: PrismaService) {
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

  const baseDate = new Date('2025-01-01T00:00:00.000Z');
  const dates = [
    new Date('2024-12-01T00:00:00.000Z'),
    new Date('2025-01-01T00:00:00.000Z'),
    new Date('2025-01-15T00:00:00.000Z'),
    new Date('2025-02-01T00:00:00.000Z'),
  ];

  for (let i = 0; i < dates.length; i++) {
    await prismaService.row.create({
      data: {
        id: `date-test-${i + 1}`,
        createdId: nanoid(),
        versionId: nanoid(),
        readonly: false,
        createdAt: dates[i],
        updatedAt: dates[i],
        publishedAt: dates[i],
        data: { index: i },
        meta: {},
        hash: nanoid(),
        schemaHash: nanoid(),
        tables: {
          connect: { versionId: table.versionId },
        },
      },
    });
  }

  return { table, baseDate, dates };
}

export async function createTableWithComplexJsonData(
  prismaService: PrismaService,
) {
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

  // Create test data with complex JSON structures for ordering tests
  const testRows = [
    {
      id: 'complex-1',
      data: {
        name: 'Alice',
        category: 'admin',
        priority: 1,
        active: true,
        score: 95.5,
        createdDate: '2025-01-01T10:00:00.000Z',
        lastLogin: '2025-01-15T14:30:00.000Z',
        user: {
          age: 35,
          profile: {
            name: 'Alice Profile',
            settings: {
              theme: 'dark',
            },
          },
        },
        tags: ['admin', 'typescript', 'react'],
        products: [
          { name: 'Product A', price: 99.99 },
          { name: 'Product B', price: 149.5 },
        ],
        scores: [85, 90, 95],
        reviews: [
          { rating: 4.5, comment: 'Great!' },
          { rating: 5.0, comment: 'Excellent!' },
        ],
      },
      meta: {
        score: 88.5,
        category: 'premium',
      },
      readonly: false,
    },
    {
      id: 'complex-2',
      data: {
        name: 'Bob',
        category: 'user',
        priority: 3,
        active: false,
        score: 78.2,
        createdDate: '2024-12-15T08:30:00.000Z',
        lastLogin: '2025-01-10T09:15:00.000Z',
        user: {
          age: 25,
          profile: {
            name: 'Bob Profile',
            settings: {
              theme: 'light',
            },
          },
        },
        tags: ['user', 'javascript', 'vue'],
        products: [
          { name: 'Product C', price: 79.99 },
          { name: 'Product D', price: 199.0 },
        ],
        scores: [70, 75, 80],
        reviews: [
          { rating: 3.5, comment: 'Good' },
          { rating: 4.0, comment: 'Nice' },
        ],
      },
      meta: {
        score: 72.8,
        category: 'standard',
      },
      readonly: true,
    },
    {
      id: 'complex-3',
      data: {
        name: 'Charlie',
        category: 'guest',
        priority: 2,
        active: true,
        score: 89.7,
        createdDate: '2024-11-20T16:45:00.000Z',
        lastLogin: '2025-01-20T11:00:00.000Z',
        user: {
          age: 42,
          profile: {
            name: 'Charlie Profile',
            settings: {
              theme: 'auto',
            },
          },
        },
        tags: ['guest', 'python', 'django'],
        products: [
          { name: 'Product E', price: 129.99 },
          { name: 'Product F', price: 89.5 },
        ],
        scores: [88, 92, 87],
        reviews: [
          { rating: 4.8, comment: 'Amazing!' },
          { rating: 4.2, comment: 'Very good!' },
        ],
      },
      meta: {
        score: 91.2,
        category: 'premium',
      },
      readonly: false,
    },
    {
      id: 'complex-4',
      data: {
        name: 'David',
        category: 'admin',
        priority: 1,
        active: true,
        score: 92.1,
        createdDate: '2025-01-05T12:00:00.000Z',
        lastLogin: '2025-01-18T16:45:00.000Z',
        user: {
          age: 31,
          profile: {
            name: 'David Profile',
            settings: {
              theme: 'dark',
            },
          },
        },
        tags: ['admin', 'nodejs', 'express'],
        products: [
          { name: 'Product G', price: 159.99 },
          { name: 'Product H', price: 299.0 },
        ],
        scores: [90, 95, 89],
        reviews: [
          { rating: 4.9, comment: 'Outstanding!' },
          { rating: 4.7, comment: 'Superb!' },
        ],
      },
      meta: {
        score: 94.8,
        category: 'premium',
      },
      readonly: false,
    },
    {
      id: 'complex-5',
      data: {
        name: 'Eve',
        category: 'user',
        priority: 4,
        active: false,
        score: 81.3,
        createdDate: '2024-10-30T07:20:00.000Z',
        lastLogin: '2025-01-05T13:30:00.000Z',
        user: {
          age: 28,
          profile: {
            name: 'Eve Profile',
            settings: {
              theme: 'light',
            },
          },
        },
        tags: ['user', 'css', 'sass'],
        products: [
          { name: 'Product I', price: 49.99 },
          { name: 'Product J', price: 119.0 },
        ],
        scores: [78, 82, 85],
        reviews: [
          { rating: 3.8, comment: 'Pretty good' },
          { rating: 4.1, comment: 'Nice work' },
        ],
      },
      meta: {
        score: 79.5,
        category: 'standard',
      },
      readonly: true,
    },
  ];

  for (const rowData of testRows) {
    await prismaService.row.create({
      data: {
        id: rowData.id,
        createdId: nanoid(),
        versionId: nanoid(),
        readonly: rowData.readonly,
        data: rowData.data,
        meta: rowData.meta,
        hash: nanoid(),
        schemaHash: nanoid(),
        tables: {
          connect: { versionId: table.versionId },
        },
      },
    });
  }

  return { table };
}
