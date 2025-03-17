import { Test } from '@nestjs/testing';
import { ForeignKeysService } from '../foreign-keys.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('ForeignKeysService', () => {
  let service: ForeignKeysService;
  let queryRawUnsafeMock: jest.Mock;

  beforeEach(async () => {
    queryRawUnsafeMock = jest.fn();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ForeignKeysService,
        {
          provide: TransactionPrismaService,
          useValue: {
            getTransaction: jest.fn().mockReturnValue({
              $queryRawUnsafe: queryRawUnsafeMock,
            }),
          },
        },
      ],
    }).compile();

    service = moduleRef.get<ForeignKeysService>(ForeignKeysService);
  });

  describe('Validation', () => {
    describe('SQL Injection Protection', () => {
      const sqlInjectionValues = [
        "'; DROP TABLE users; --",
        '" OR "1"="1',
        "' UNION SELECT * FROM users; --",
        '\\',
        "'",
        '"',
        ';',
        '--',
        '@@version',
        'pg_sleep(10)',
        'sys.tables',
        'information_schema.tables',
      ];

      describe('Common Parameters', () => {
        it.each(sqlInjectionValues)(
          'should throw BadRequestException for SQL injection in tableVersionId: %s',
          async (value) => {
            await expect(
              service.findRowsByKeyValueInData(value, 'key', 'validValue'),
            ).rejects.toThrow(/tableVersionId contains invalid characters/);
          },
        );

        it.each(sqlInjectionValues)(
          'should throw BadRequestException for SQL injection in value: %s',
          async (value) => {
            await expect(
              service.findRowsByKeyValueInData('validId', 'key', value),
            ).rejects.toThrow(/value contains invalid characters/);
          },
        );
      });

      describe('Key-Value Parameters', () => {
        it.each(sqlInjectionValues)(
          'should throw BadRequestException for SQL injection in key: %s',
          async (value) => {
            await expect(
              service.findRowsByKeyValueInData('validId', value, 'validValue'),
            ).rejects.toThrow(/key contains invalid characters/);
          },
        );
      });

      describe('Paths Parameters', () => {
        it.each(sqlInjectionValues)(
          'should throw BadRequestException for SQL injection in jsonPaths: %s',
          async (value) => {
            await expect(
              service.findRowsByPathsAndValueInData(
                'validId',
                [value],
                'validValue',
              ),
            ).rejects.toThrow(/jsonPaths\[\d+\] contains invalid characters/);
          },
        );
      });
    });

    describe('JSONPath Value Validation', () => {
      const jsonPathValues = [
        { value: '$.store.book[*]', description: 'JSONPath root symbol' },
        { value: '@.length', description: 'JSONPath current object' },
        { value: '*', description: 'JSONPath wildcard' },
        { value: '[0]', description: 'JSONPath array access' },
        { value: '{key: value}', description: 'JSONPath object' },
        { value: '?(@.price > 10)', description: 'JSONPath filter expression' },
        { value: '(1 to 5)', description: 'JSONPath array slice' },
        { value: '.property', description: 'JSONPath dot notation' },
        { value: ':key', description: 'JSONPath key' },
        { value: ',', description: 'JSONPath union' },
        { value: '&', description: 'JSONPath intersection' },
        { value: '|', description: 'JSONPath alternative' },
        { value: '!true', description: 'JSONPath negation' },
        { value: '<10', description: 'JSONPath comparison' },
        { value: '=42', description: 'JSONPath equality' },
        { value: '>0', description: 'JSONPath comparison' },
      ];

      it.each(jsonPathValues)(
        'should throw BadRequestException for JSONPath symbol in value: $description',
        async ({ value }) => {
          await expect(
            service.findRowsByKeyValueInData('validId', 'key', value),
          ).rejects.toThrow('value contains invalid JSONPath characters');
        },
      );

      const unicodeValues = ['\\u0000', '\\u0001', '\\uFFFF', '\\u1234'];

      it.each(unicodeValues)(
        'should throw BadRequestException for Unicode escape sequence in value: %s',
        async (value) => {
          await expect(
            service.findRowsByKeyValueInData('validId', 'key', value),
          ).rejects.toThrow('value contains invalid Unicode sequences');
        },
      );

      const controlChars = [
        { value: '\x00', description: 'NULL' },
        { value: '\x0A', description: 'Line Feed' },
        { value: '\x0D', description: 'Carriage Return' },
        { value: '\x1F', description: 'Unit Separator' },
        { value: '\x7F', description: 'Delete' },
      ];

      it.each(controlChars)(
        'should throw BadRequestException for control character in value: $description',
        async ({ value }) => {
          await expect(
            service.findRowsByKeyValueInData('validId', 'key', value),
          ).rejects.toThrow('value contains invalid control characters');
        },
      );

      it('should throw BadRequestException for value exceeding maximum length', async () => {
        const longValue = 'a'.repeat(1001);
        await expect(
          service.findRowsByKeyValueInData('validId', 'key', longValue),
        ).rejects.toThrow('value exceeds maximum length of 1000 characters');
      });

      it('should accept valid simple string value', async () => {
        queryRawUnsafeMock.mockResolvedValueOnce([]);
        await expect(
          service.findRowsByKeyValueInData(
            'validId',
            'key',
            'simple value 123',
          ),
        ).resolves.not.toThrow();
      });
    });

    describe('Required Parameters', () => {
      it('should throw BadRequestException if tableVersionId is empty', async () => {
        await expect(
          service.findRowsByKeyValueInData('', 'key', 'value'),
        ).rejects.toThrow('tableVersionId cannot be empty');
      });

      it('should throw BadRequestException if key is empty', async () => {
        await expect(
          service.findRowsByKeyValueInData('tableVersionId', '', 'value'),
        ).rejects.toThrow('key cannot be empty');
      });

      it('should throw BadRequestException if value is empty', async () => {
        await expect(
          service.findRowsByKeyValueInData('tableVersionId', 'key', ''),
        ).rejects.toThrow('value cannot be empty');
      });

      it('should throw BadRequestException if jsonPaths is empty', async () => {
        await expect(
          service.findRowsByPathsAndValueInData('tableVersionId', [], 'value'),
        ).rejects.toThrow('jsonPaths cannot be empty');
      });
    });

    describe('Pagination Parameters', () => {
      it('should throw BadRequestException if limit is negative', async () => {
        await expect(
          service.findRowsByKeyValueInData(
            'tableVersionId',
            'key',
            'value',
            -1,
          ),
        ).rejects.toThrow('limit cannot be negative');
      });

      it('should throw BadRequestException if offset is negative', async () => {
        await expect(
          service.findRowsByKeyValueInData(
            'tableVersionId',
            'key',
            'value',
            100,
            -1,
          ),
        ).rejects.toThrow('offset cannot be negative');
      });
    });
  });

  describe('Query Execution', () => {
    const validParams = {
      tableVersionId: 'validId',
      key: 'validKey',
      value: 'validValue',
      paths: ['validPath'],
    };

    beforeEach(() => {
      queryRawUnsafeMock.mockReset();
    });

    describe('findRowsByKeyValueInData', () => {
      it('should execute query with correct parameters', async () => {
        queryRawUnsafeMock.mockResolvedValueOnce([]);
        await service.findRowsByKeyValueInData(
          validParams.tableVersionId,
          validParams.key,
          validParams.value,
        );

        expect(queryRawUnsafeMock).toHaveBeenCalledWith(
          expect.stringContaining(
            `WHERE "B" = '${validParams.tableVersionId}'`,
          ),
        );
        expect(queryRawUnsafeMock).toHaveBeenCalledWith(
          expect.stringContaining(
            `$.**.${validParams.key} ? (@ == "${validParams.value}")`,
          ),
        );
      });

      it('should apply pagination parameters', async () => {
        const limit = 50;
        const offset = 10;
        queryRawUnsafeMock.mockResolvedValueOnce([]);

        await service.findRowsByKeyValueInData(
          validParams.tableVersionId,
          validParams.key,
          validParams.value,
          limit,
          offset,
        );

        expect(queryRawUnsafeMock).toHaveBeenCalledWith(
          expect.stringContaining(`LIMIT ${limit}`),
        );
        expect(queryRawUnsafeMock).toHaveBeenCalledWith(
          expect.stringContaining(`OFFSET ${offset}`),
        );
      });
    });

    describe('countRowsByKeyValueInData', () => {
      it('should return count of matching rows', async () => {
        const expectedCount = 42;
        queryRawUnsafeMock.mockResolvedValueOnce([{ count: expectedCount }]);

        const result = await service.countRowsByKeyValueInData(
          validParams.tableVersionId,
          validParams.key,
          validParams.value,
        );

        expect(result).toBe(expectedCount);
        expect(queryRawUnsafeMock).toHaveBeenCalledWith(
          expect.stringContaining('SELECT count(*)'),
        );
      });
    });

    describe('findRowsByPathsAndValueInData', () => {
      it('should execute query with correct paths', async () => {
        queryRawUnsafeMock.mockResolvedValueOnce([]);

        await service.findRowsByPathsAndValueInData(
          validParams.tableVersionId,
          validParams.paths,
          validParams.value,
        );

        expect(queryRawUnsafeMock).toHaveBeenCalledWith(
          expect.stringContaining(
            `'${validParams.paths[0]} ? (@ == "${validParams.value}")'`,
          ),
        );
      });

      it('should combine multiple paths with OR', async () => {
        const paths = ['path1', 'path2'];
        queryRawUnsafeMock.mockResolvedValueOnce([]);

        await service.findRowsByPathsAndValueInData(
          validParams.tableVersionId,
          paths,
          validParams.value,
        );

        const query = queryRawUnsafeMock.mock.calls[0][0];
        expect(query).toContain('OR');
        paths.forEach((path) => {
          expect(query).toContain(`'${path} ? (@ == "${validParams.value}")'`);
        });
      });
    });

    describe('countRowsByPathsAndValueInData', () => {
      it('should return count of matching rows for paths', async () => {
        const expectedCount = 42;
        queryRawUnsafeMock.mockResolvedValueOnce([{ count: expectedCount }]);

        const result = await service.countRowsByPathsAndValueInData(
          validParams.tableVersionId,
          validParams.paths,
          validParams.value,
        );

        expect(result).toBe(expectedCount);
        expect(queryRawUnsafeMock).toHaveBeenCalledWith(
          expect.stringContaining('SELECT count(*)'),
        );
      });
    });
  });
});
