import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import * as hash from 'object-hash';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { ForeignKeysService } from '../foreign-keys.service';

describe('ForeignKeysService', () => {
  let module: TestingModule;
  let service: ForeignKeysService;
  let prismaService: PrismaService;
  let transactionPrismaService: TransactionPrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [ForeignKeysService, TransactionPrismaService],
    }).compile();

    service = module.get<ForeignKeysService>(ForeignKeysService);
    prismaService = module.get<PrismaService>(PrismaService);
    transactionPrismaService = module.get<TransactionPrismaService>(
      TransactionPrismaService,
    );
  });

  afterAll(async () => {
    await module.close();
  });

  describe('findRowsByKeyValueInData', () => {
    it('should find rows by key-value in JSON data', async () => {
      const tableVersionId = await createTableWithRows();

      const results = await transactionPrismaService.run(async () => {
        return service.findRowsByKeyValueInData(
          tableVersionId,
          'title',
          'Test Title 1',
          10,
          0,
        );
      });

      expect(results).toHaveLength(1);
      expect(results[0].data).toEqual({ title: 'Test Title 1', count: 10 });
    });

    it('should return empty array when no matches found', async () => {
      const tableVersionId = await createTableWithRows();

      const results = await transactionPrismaService.run(async () => {
        return service.findRowsByKeyValueInData(
          tableVersionId,
          'title',
          'Non-existent Title',
          10,
          0,
        );
      });

      expect(results).toHaveLength(0);
    });

    it('should respect limit and offset parameters', async () => {
      const tableVersionId = await createTableWithManyRows();

      const results = await transactionPrismaService.run(async () => {
        return service.findRowsByKeyValueInData(
          tableVersionId,
          'category',
          'test',
          2,
          1,
        );
      });

      expect(results).toHaveLength(2);
    });
  });

  describe('countRowsByKeyValueInData', () => {
    it('should count rows by key-value in JSON data', async () => {
      const tableVersionId = await createTableWithRows();

      const count = await transactionPrismaService.run(async () => {
        return service.countRowsByKeyValueInData(
          tableVersionId,
          'title',
          'Test Title 1',
        );
      });

      expect(count).toBe(1);
    });

    it('should return 0 when no matches found', async () => {
      const tableVersionId = await createTableWithRows();

      const count = await transactionPrismaService.run(async () => {
        return service.countRowsByKeyValueInData(
          tableVersionId,
          'title',
          'Non-existent Title',
        );
      });

      expect(count).toBe(0);
    });
  });

  describe('findRowsByPathsAndValueInData', () => {
    it('should find rows by JSON paths and value', async () => {
      const tableVersionId = await createTableWithNestedData();

      const results = await transactionPrismaService.run(async () => {
        return service.findRowsByPathsAndValueInData(
          tableVersionId,
          ['$.user.id', '$.metadata.userId'],
          'user123',
          10,
          0,
        );
      });

      expect(results).toHaveLength(2);
    });

    it('should return empty array when jsonPaths is empty', async () => {
      const tableVersionId = await createTableWithRows();

      const results = await transactionPrismaService.run(async () => {
        return service.findRowsByPathsAndValueInData(
          tableVersionId,
          [],
          'any-value',
          10,
          0,
        );
      });

      expect(results).toHaveLength(0);
    });

    it('should handle multiple paths with OR logic', async () => {
      const tableVersionId = await createTableWithMultipleFields();

      const results = await transactionPrismaService.run(async () => {
        return service.findRowsByPathsAndValueInData(
          tableVersionId,
          ['$.author', '$.editor'],
          'john',
          10,
          0,
        );
      });

      expect(results).toHaveLength(3); // 2 with author=john, 1 with editor=john
    });

    it('should respect limit and offset', async () => {
      const tableVersionId = await createTableWithManyRows();

      const results = await transactionPrismaService.run(async () => {
        return service.findRowsByPathsAndValueInData(
          tableVersionId,
          ['$.category'],
          'test',
          2,
          2,
        );
      });

      expect(results).toHaveLength(2);
    });
  });

  describe('countRowsByPathsAndValueInData', () => {
    it('should count rows by JSON paths and value', async () => {
      const tableVersionId = await createTableWithNestedData();

      const count = await transactionPrismaService.run(async () => {
        return service.countRowsByPathsAndValueInData(
          tableVersionId,
          ['$.user.id', '$.metadata.userId'],
          'user123',
        );
      });

      expect(count).toBe(2);
    });

    it('should return 0 when jsonPaths is empty', async () => {
      const tableVersionId = await createTableWithRows();

      const count = await transactionPrismaService.run(async () => {
        return service.countRowsByPathsAndValueInData(
          tableVersionId,
          [],
          'any-value',
        );
      });

      expect(count).toBe(0);
    });

    it('should handle multiple paths with OR logic', async () => {
      const tableVersionId = await createTableWithMultipleFields();

      const count = await transactionPrismaService.run(async () => {
        return service.countRowsByPathsAndValueInData(
          tableVersionId,
          ['$.author', '$.editor'],
          'john',
        );
      });

      expect(count).toBe(3); // 2 with author=john, 1 with editor=john
    });
  });

  describe('Security Tests for $queryRawUnsafe', () => {
    it('should handle SQL injection attempts in key parameter', async () => {
      const tableVersionId = await createTableWithRows();

      // Test with malicious key
      await expect(
        transactionPrismaService.run(async () => {
          return service.findRowsByKeyValueInData(
            tableVersionId,
            'title\'; DROP TABLE "Row"; --',
            'test',
            10,
            0,
          );
        }),
      ).rejects.toThrow();
    });

    it('should handle SQL injection attempts in value parameter', async () => {
      const tableVersionId = await createTableWithRows();

      // Test with malicious value
      await expect(
        transactionPrismaService.run(async () => {
          return service.findRowsByKeyValueInData(
            tableVersionId,
            'title',
            'test\'; DROP TABLE "Row"; --',
            10,
            0,
          );
        }),
      ).rejects.toThrow();
    });

    it('should handle SQL injection attempts in tableVersionId parameter', async () => {
      // Test with malicious tableVersionId
      await expect(
        transactionPrismaService.run(async () => {
          return service.findRowsByKeyValueInData(
            'test\'; DROP TABLE "Row"; --',
            'title',
            'test',
            10,
            0,
          );
        }),
      ).rejects.toThrow();
    });

    it('should handle SQL injection attempts in jsonPaths parameter', async () => {
      const tableVersionId = await createTableWithRows();

      await expect(
        transactionPrismaService.run(async () => {
          return service.findRowsByPathsAndValueInData(
            tableVersionId,
            ['$\'; DROP TABLE "Row"; --'],
            'test',
            10,
            0,
          );
        }),
      ).rejects.toThrow();
    });

    it('should handle special characters in legitimate data', async () => {
      const tableVersionId = await createTableWithSpecialChars();

      await expect(
        transactionPrismaService.run(async () => {
          return service.findRowsByKeyValueInData(
            tableVersionId,
            'title',
            'Title with \'quotes\' and "double quotes"',
            10,
            0,
          );
        }),
      ).rejects.toThrow();
    });
  });

  async function createTableWithRows() {
    const tableVersionId = nanoid();
    const branchId = nanoid();
    const revisionId = nanoid();

    // Create branch with revision
    await prismaService.branch.create({
      data: {
        id: branchId,
        name: `test-branch-${nanoid()}`,
        isRoot: true,
        project: {
          create: {
            id: nanoid(),
            name: `test-project-${nanoid()}`,
            organization: {
              create: {
                id: nanoid(),
                createdId: nanoid(),
              },
            },
          },
        },
        revisions: {
          create: {
            id: revisionId,
            isStart: true,
            isHead: true,
            hasChanges: false,
          },
        },
      },
    });

    // Create table
    await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: tableVersionId,
        revisions: {
          connect: { id: revisionId },
        },
      },
    });

    // Create rows
    const rowsData = [
      { title: 'Test Title 1', count: 10 },
      { title: 'Test Title 2', count: 20 },
      { title: 'Another Title', count: 15 },
    ];

    for (const data of rowsData) {
      await prismaService.row.create({
        data: {
          id: nanoid(),
          versionId: nanoid(),
          createdId: nanoid(),
          data,
          hash: hash(data),
          schemaHash: 'test-schema-hash',
          tables: {
            connect: { versionId: tableVersionId },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: new Date(),
        },
      });
    }

    return tableVersionId;
  }

  async function createTableWithNestedData() {
    const tableVersionId = nanoid();
    const branchId = nanoid();
    const revisionId = nanoid();

    // Create branch with revision
    await prismaService.branch.create({
      data: {
        id: branchId,
        name: `test-branch-${nanoid()}`,
        isRoot: true,
        project: {
          create: {
            id: nanoid(),
            name: `test-project-${nanoid()}`,
            organization: {
              create: {
                id: nanoid(),
                createdId: nanoid(),
              },
            },
          },
        },
        revisions: {
          create: {
            id: revisionId,
            isStart: true,
            isHead: true,
            hasChanges: false,
          },
        },
      },
    });

    // Create table
    await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: tableVersionId,
        revisions: {
          connect: { id: revisionId },
        },
      },
    });

    // Create rows with nested data
    const rowsData = [
      { user: { id: 'user123', name: 'John' }, title: 'First Post' },
      { metadata: { userId: 'user123', type: 'draft' }, title: 'Second Post' },
      { user: { id: 'user456', name: 'Jane' }, title: 'Third Post' },
    ];

    for (const data of rowsData) {
      await prismaService.row.create({
        data: {
          id: nanoid(),
          versionId: nanoid(),
          createdId: nanoid(),
          data,
          hash: hash(data),
          schemaHash: 'test-schema-hash',
          tables: {
            connect: { versionId: tableVersionId },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: new Date(),
        },
      });
    }

    return tableVersionId;
  }

  async function createTableWithMultipleFields() {
    const tableVersionId = nanoid();
    const branchId = nanoid();
    const revisionId = nanoid();

    // Create branch with revision
    await prismaService.branch.create({
      data: {
        id: branchId,
        name: `test-branch-${nanoid()}`,
        isRoot: true,
        project: {
          create: {
            id: nanoid(),
            name: `test-project-${nanoid()}`,
            organization: {
              create: {
                id: nanoid(),
                createdId: nanoid(),
              },
            },
          },
        },
        revisions: {
          create: {
            id: revisionId,
            isStart: true,
            isHead: true,
            hasChanges: false,
          },
        },
      },
    });

    // Create table
    await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: tableVersionId,
        revisions: {
          connect: { id: revisionId },
        },
      },
    });

    // Create rows with multiple fields that can match
    const rowsData = [
      { author: 'john', editor: 'mary', title: 'First Article' },
      { author: 'john', editor: 'bob', title: 'Second Article' },
      { author: 'jane', editor: 'john', title: 'Third Article' },
      { author: 'bob', editor: 'mary', title: 'Fourth Article' },
    ];

    for (const data of rowsData) {
      await prismaService.row.create({
        data: {
          id: nanoid(),
          versionId: nanoid(),
          createdId: nanoid(),
          data,
          hash: hash(data),
          schemaHash: 'test-schema-hash',
          tables: {
            connect: { versionId: tableVersionId },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: new Date(),
        },
      });
    }

    return tableVersionId;
  }

  async function createTableWithManyRows() {
    const tableVersionId = nanoid();
    const branchId = nanoid();
    const revisionId = nanoid();

    // Create branch with revision
    await prismaService.branch.create({
      data: {
        id: branchId,
        name: `test-branch-${nanoid()}`,
        isRoot: true,
        project: {
          create: {
            id: nanoid(),
            name: `test-project-${nanoid()}`,
            organization: {
              create: {
                id: nanoid(),
                createdId: nanoid(),
              },
            },
          },
        },
        revisions: {
          create: {
            id: revisionId,
            isStart: true,
            isHead: true,
            hasChanges: false,
          },
        },
      },
    });

    // Create table
    await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: tableVersionId,
        revisions: {
          connect: { id: revisionId },
        },
      },
    });

    // Create 10 rows with same category
    for (let i = 0; i < 10; i++) {
      const data = { category: 'test', index: i, title: `Title ${i}` };
      await prismaService.row.create({
        data: {
          id: nanoid(),
          versionId: nanoid(),
          createdId: nanoid(),
          data,
          hash: hash(data),
          schemaHash: 'test-schema-hash',
          tables: {
            connect: { versionId: tableVersionId },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: new Date(),
        },
      });
    }

    return tableVersionId;
  }

  async function createTableWithSpecialChars() {
    const tableVersionId = nanoid();
    const branchId = nanoid();
    const revisionId = nanoid();

    // Create branch with revision
    await prismaService.branch.create({
      data: {
        id: branchId,
        name: `test-branch-${nanoid()}`,
        isRoot: true,
        project: {
          create: {
            id: nanoid(),
            name: `test-project-${nanoid()}`,
            organization: {
              create: {
                id: nanoid(),
                createdId: nanoid(),
              },
            },
          },
        },
        revisions: {
          create: {
            id: revisionId,
            isStart: true,
            isHead: true,
            hasChanges: false,
          },
        },
      },
    });

    // Create table
    await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: tableVersionId,
        revisions: {
          connect: { id: revisionId },
        },
      },
    });

    // Create row with special characters
    const data = {
      title: 'Title with \'quotes\' and "double quotes"',
      description: 'Text with; semicolon and -- comment',
      content: 'Some $pecial ch@r@cters!',
    };

    await prismaService.row.create({
      data: {
        id: nanoid(),
        versionId: nanoid(),
        createdId: nanoid(),
        data,
        hash: hash(data),
        schemaHash: 'test-schema-hash',
        tables: {
          connect: { versionId: tableVersionId },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
      },
    });

    return tableVersionId;
  }
});
