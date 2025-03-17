import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ForeignKeysService } from '../foreign-keys.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('ForeignKeysService', () => {
  let service: ForeignKeysService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ForeignKeysService,
        {
          provide: TransactionPrismaService,
          useValue: {
            getTransaction: jest.fn().mockReturnValue({
              $queryRawUnsafe: jest.fn(),
            }),
          },
        },
      ],
    }).compile();

    service = moduleRef.get<ForeignKeysService>(ForeignKeysService);
  });

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
    ];

    describe('findRowsByKeyValueInData', () => {
      it.each(sqlInjectionValues)(
        'should throw BadRequestException for SQL injection in tableVersionId: %s',
        async (value) => {
          await expect(
            service.findRowsByKeyValueInData(value, 'key', 'value'),
          ).rejects.toThrow(BadRequestException);
        },
      );

      it.each(sqlInjectionValues)(
        'should throw BadRequestException for SQL injection in key: %s',
        async (value) => {
          await expect(
            service.findRowsByKeyValueInData('tableVersionId', value, 'value'),
          ).rejects.toThrow(BadRequestException);
        },
      );

      it.each(sqlInjectionValues)(
        'should throw BadRequestException for SQL injection in value: %s',
        async (value) => {
          await expect(
            service.findRowsByKeyValueInData('tableVersionId', 'key', value),
          ).rejects.toThrow(BadRequestException);
        },
      );
    });

    describe('countRowsByKeyValueInData', () => {
      it.each(sqlInjectionValues)(
        'should throw BadRequestException for SQL injection in tableVersionId: %s',
        async (value) => {
          await expect(
            service.countRowsByKeyValueInData(value, 'key', 'value'),
          ).rejects.toThrow(BadRequestException);
        },
      );

      it.each(sqlInjectionValues)(
        'should throw BadRequestException for SQL injection in key: %s',
        async (value) => {
          await expect(
            service.countRowsByKeyValueInData('tableVersionId', value, 'value'),
          ).rejects.toThrow(BadRequestException);
        },
      );

      it.each(sqlInjectionValues)(
        'should throw BadRequestException for SQL injection in value: %s',
        async (value) => {
          await expect(
            service.countRowsByKeyValueInData('tableVersionId', 'key', value),
          ).rejects.toThrow(BadRequestException);
        },
      );
    });

    describe('findRowsByPathsAndValueInData', () => {
      it.each(sqlInjectionValues)(
        'should throw BadRequestException for SQL injection in tableVersionId: %s',
        async (value) => {
          await expect(
            service.findRowsByPathsAndValueInData(value, ['path'], 'value'),
          ).rejects.toThrow(BadRequestException);
        },
      );

      it.each(sqlInjectionValues)(
        'should throw BadRequestException for SQL injection in jsonPaths: %s',
        async (value) => {
          await expect(
            service.findRowsByPathsAndValueInData(
              'tableVersionId',
              [value],
              'value',
            ),
          ).rejects.toThrow(BadRequestException);
        },
      );

      it.each(sqlInjectionValues)(
        'should throw BadRequestException for SQL injection in value: %s',
        async (value) => {
          await expect(
            service.findRowsByPathsAndValueInData(
              'tableVersionId',
              ['path'],
              value,
            ),
          ).rejects.toThrow(BadRequestException);
        },
      );
    });

    describe('countRowsByPathsAndValueInData', () => {
      it.each(sqlInjectionValues)(
        'should throw BadRequestException for SQL injection in tableVersionId: %s',
        async (value) => {
          await expect(
            service.countRowsByPathsAndValueInData(value, ['path'], 'value'),
          ).rejects.toThrow(BadRequestException);
        },
      );

      it.each(sqlInjectionValues)(
        'should throw BadRequestException for SQL injection in jsonPaths: %s',
        async (value) => {
          await expect(
            service.countRowsByPathsAndValueInData(
              'tableVersionId',
              [value],
              'value',
            ),
          ).rejects.toThrow(BadRequestException);
        },
      );

      it.each(sqlInjectionValues)(
        'should throw BadRequestException for SQL injection in value: %s',
        async (value) => {
          await expect(
            service.countRowsByPathsAndValueInData(
              'tableVersionId',
              ['path'],
              value,
            ),
          ).rejects.toThrow(BadRequestException);
        },
      );
    });
  });

  describe('findRowsByKeyValueInData', () => {
    it('should throw BadRequestException if tableVersionId is empty', async () => {
      await expect(
        service.findRowsByKeyValueInData('', 'key', 'value'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if key is empty', async () => {
      await expect(
        service.findRowsByKeyValueInData('tableVersionId', '', 'value'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if value is empty', async () => {
      await expect(
        service.findRowsByKeyValueInData('tableVersionId', 'key', ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if limit is less than 0', async () => {
      await expect(
        service.findRowsByKeyValueInData('tableVersionId', 'key', 'value', -1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if offset is less than 0', async () => {
      await expect(
        service.findRowsByKeyValueInData(
          'tableVersionId',
          'key',
          'value',
          100,
          -1,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('countRowsByKeyValueInData', () => {
    it('should throw BadRequestException if tableVersionId is empty', async () => {
      await expect(
        service.countRowsByKeyValueInData('', 'key', 'value'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if key is empty', async () => {
      await expect(
        service.countRowsByKeyValueInData('tableVersionId', '', 'value'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if value is empty', async () => {
      await expect(
        service.countRowsByKeyValueInData('tableVersionId', 'key', ''),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findRowsByPathsAndValueInData', () => {
    it('should throw BadRequestException if tableVersionId is empty', async () => {
      await expect(
        service.findRowsByPathsAndValueInData('', ['path'], 'value'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if jsonPaths is empty', async () => {
      await expect(
        service.findRowsByPathsAndValueInData('tableVersionId', [], 'value'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if value is empty', async () => {
      await expect(
        service.findRowsByPathsAndValueInData('tableVersionId', ['path'], ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if limit is less than 0', async () => {
      await expect(
        service.findRowsByPathsAndValueInData(
          'tableVersionId',
          ['path'],
          'value',
          -1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if offset is less than 0', async () => {
      await expect(
        service.findRowsByPathsAndValueInData(
          'tableVersionId',
          ['path'],
          'value',
          100,
          -1,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('countRowsByPathsAndValueInData', () => {
    it('should throw BadRequestException if tableVersionId is empty', async () => {
      await expect(
        service.countRowsByPathsAndValueInData('', ['path'], 'value'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if jsonPaths is empty', async () => {
      await expect(
        service.countRowsByPathsAndValueInData('tableVersionId', [], 'value'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if value is empty', async () => {
      await expect(
        service.countRowsByPathsAndValueInData('tableVersionId', ['path'], ''),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
