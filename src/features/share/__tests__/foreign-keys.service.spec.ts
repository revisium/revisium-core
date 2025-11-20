import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import hash from 'object-hash';
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

  describe('Validation Tests', () => {
    it('should accept keys with numbers, hyphens and other valid characters', async () => {
      const tableVersionId = await createTableWithSpecialKeys();

      // These should all work now
      const results1 = await transactionPrismaService.run(async () => {
        return service.findRowsByKeyValueInData(
          tableVersionId,
          '123numerickey',
          'value1',
          10,
          0,
        );
      });

      const results2 = await transactionPrismaService.run(async () => {
        return service.findRowsByKeyValueInData(
          tableVersionId,
          'key-with-hyphens',
          'value2',
          10,
          0,
        );
      });

      const results3 = await transactionPrismaService.run(async () => {
        return service.findRowsByKeyValueInData(
          tableVersionId,
          'key.with.dots',
          'value3',
          10,
          0,
        );
      });

      const results4 = await transactionPrismaService.run(async () => {
        return service.findRowsByKeyValueInData(
          tableVersionId,
          'key with spaces',
          'value4',
          10,
          0,
        );
      });

      expect(results1).toHaveLength(1);
      expect(results2).toHaveLength(1);
      expect(results3).toHaveLength(1);
      expect(results4).toHaveLength(1);
    });

    it('should reject keys with null bytes', async () => {
      const tableVersionId = await createTableWithRows();

      await expect(
        transactionPrismaService.run(async () => {
          return service.findRowsByKeyValueInData(
            tableVersionId,
            'key\0withnull',
            'test',
            10,
            0,
          );
        }),
      ).rejects.toThrow('contains null byte');
    });

    it('should reject extremely long keys', async () => {
      const tableVersionId = await createTableWithRows();
      const longKey = 'a'.repeat(1001);

      await expect(
        transactionPrismaService.run(async () => {
          return service.findRowsByKeyValueInData(
            tableVersionId,
            longKey,
            'test',
            10,
            0,
          );
        }),
      ).rejects.toThrow('too long');
    });

    it('should handle special characters in values with parameterized queries', async () => {
      const tableVersionId = await createTableWithSpecialChars();

      // Values with special characters should work fine with parameterized queries
      const results = await transactionPrismaService.run(async () => {
        return service.findRowsByKeyValueInData(
          tableVersionId,
          'title',
          'Title with \'quotes\' and "double quotes"',
          10,
          0,
        );
      });

      // Should find the matching row
      expect(results).toHaveLength(1);
    });

    it('should handle backslashes in values with parameterized queries', async () => {
      const tableVersionId = await createTableWithBackslashes();

      // Values with backslashes should work fine with parameterized queries
      const results = await transactionPrismaService.run(async () => {
        return service.findRowsByKeyValueInData(
          tableVersionId,
          'path',
          'C:\\Windows\\System32\\file.exe',
          10,
          0,
        );
      });

      // Should find the matching row
      expect(results).toHaveLength(1);
    });

    it('should handle potentially malicious values safely with parameterized queries', async () => {
      const tableVersionId = await createTableWithRows();

      // Malicious values should be treated as literal strings, not SQL
      const results = await transactionPrismaService.run(async () => {
        return service.findRowsByKeyValueInData(
          tableVersionId,
          'title',
          'test\'; DROP TABLE "Row"; --',
          10,
          0,
        );
      });

      // Should return no results (treated as literal string match)
      expect(results).toHaveLength(0);
    });

    it('should find data using JSON paths with various special characters', async () => {
      const tableVersionId = await createTableWithSpecialKeys();

      // Test finding data with $ in field name
      const results1 = await transactionPrismaService.run(async () => {
        return service.findRowsByPathsAndValueInData(
          tableVersionId,
          ['$."field$with$dollars"'],
          'value9',
          10,
          0,
        );
      });

      // Test finding data with ; in field name
      const results2 = await transactionPrismaService.run(async () => {
        return service.findRowsByPathsAndValueInData(
          tableVersionId,
          ['$."field;with;semicolons"'],
          'value10',
          10,
          0,
        );
      });

      // Test finding data with " in field name (escaped in JSON)
      const results3 = await transactionPrismaService.run(async () => {
        return service.findRowsByPathsAndValueInData(
          tableVersionId,
          ['$."field\\"with\\"quotes"'],
          'value11',
          10,
          0,
        );
      });

      // Should find the matching rows
      expect(results1).toHaveLength(1);
      expect(results2).toHaveLength(1);
      expect(results3).toHaveLength(1);

      expect(results1[0].data).toHaveProperty('field$with$dollars', 'value9');
      expect(results2[0].data).toHaveProperty(
        'field;with;semicolons',
        'value10',
      );
      expect(results3[0].data).toHaveProperty('field"with"quotes', 'value11');
    });

    it('should reject JSON paths with null bytes', async () => {
      const tableVersionId = await createTableWithRows();

      await expect(
        transactionPrismaService.run(async () => {
          return service.findRowsByPathsAndValueInData(
            tableVersionId,
            ['$.field\0withnull'],
            'test',
            10,
            0,
          );
        }),
      ).rejects.toThrow('contains null byte');
    });

    it('should reject JSON paths not starting with $', async () => {
      const tableVersionId = await createTableWithRows();

      await expect(
        transactionPrismaService.run(async () => {
          return service.findRowsByPathsAndValueInData(
            tableVersionId,
            ['invalid.path'],
            'test',
            10,
            0,
          );
        }),
      ).rejects.toThrow('Invalid JSON path: must start with $');
    });

    it('should work correctly with field names containing SQL keywords', async () => {
      const tableVersionId = await createTableWithLegitimateFieldNames();

      // Test that legitimate field names containing SQL keywords work correctly
      const results = await transactionPrismaService.run(async () => {
        return service.findRowsByKeyValueInData(
          tableVersionId,
          'fieldDROP', // Legitimate field name containing DROP
          'some value',
          10,
          0,
        );
      });

      expect(results).toHaveLength(1);
      expect(results[0].data).toEqual({
        fieldDROP: 'some value',
        myUpdateField: 'another value',
        categoryDELETE: 'test',
      });
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

  async function createTableWithLegitimateFieldNames() {
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

    // Create row with legitimate field names that contain SQL keywords
    const data = {
      fieldDROP: 'some value',
      myUpdateField: 'another value',
      categoryDELETE: 'test',
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

  async function createTableWithBackslashes() {
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

    // Create row with backslashes
    const data = {
      path: 'C:\\Windows\\System32\\file.exe',
      description: 'File path with \\backslashes\\ and "quotes"',
      regex: '\\d+\\.\\d+',
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

  async function createTableWithSpecialKeys() {
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

    // Create row with special key names that should be supported
    const data = {
      '123numerickey': 'value1',
      'key-with-hyphens': 'value2',
      'key.with.dots': 'value3',
      'key with spaces': 'value4',
      _underscore_key: 'value5',
      UPPERCASE_KEY: 'value6',
      кирилица: 'value7',
      特殊字符: 'value8',
      field$with$dollars: 'value9',
      'field;with;semicolons': 'value10',
      'field"with"quotes': 'value11',
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
