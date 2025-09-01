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
