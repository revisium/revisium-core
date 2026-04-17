import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  getObjectSchema,
  getStringSchema,
  getNumberSchema,
} from '@revisium/schema-toolkit/mocks';
import { ViewValidationService } from 'src/features/views/services/view-validation.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { JsonSchemaStoreService } from '@revisium/engine';

describe('ViewValidationService', () => {
  let service: ViewValidationService;
  let shareTransactionalQueries: jest.Mocked<ShareTransactionalQueries>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ViewValidationService,
        JsonSchemaStoreService,
        {
          provide: ShareTransactionalQueries,
          useValue: {
            getTableSchema: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ViewValidationService);
    shareTransactionalQueries = module.get(ShareTransactionalQueries);
  });

  const makeViewsData = (columns: string[]): any => ({
    version: 1,
    defaultViewId: 'view-1',
    views: [
      {
        id: 'view-1',
        name: 'Test View',
        columns: columns.map((field) => ({ field, width: 200 })),
      },
    ],
  });

  it('should accept valid data fields', async () => {
    shareTransactionalQueries.getTableSchema.mockResolvedValue({
      schema: getObjectSchema({
        name: getStringSchema(),
        age: getNumberSchema(),
      }),
    } as any);

    await expect(
      service.validateViewsFields(
        'rev-1',
        'users',
        makeViewsData(['data.name', 'data.age']),
      ),
    ).resolves.toBeUndefined();
  });

  it('should reject invalid data fields', async () => {
    shareTransactionalQueries.getTableSchema.mockResolvedValue({
      schema: getObjectSchema({
        name: getStringSchema(),
      }),
    } as any);

    await expect(
      service.validateViewsFields(
        'rev-1',
        'users',
        makeViewsData(['data.missing']),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should accept system fields without schema lookup', async () => {
    shareTransactionalQueries.getTableSchema.mockResolvedValue({
      schema: getObjectSchema({}),
    } as any);

    await expect(
      service.validateViewsFields(
        'rev-1',
        'users',
        makeViewsData(['id', 'createdAt']),
      ),
    ).resolves.toBeUndefined();
  });

  it('should handle hyphenated field names', async () => {
    shareTransactionalQueries.getTableSchema.mockResolvedValue({
      schema: getObjectSchema({
        'test-case': getStringSchema(),
        'api-surface': getStringSchema(),
      }),
    } as any);

    await expect(
      service.validateViewsFields(
        'rev-1',
        'test-results',
        makeViewsData(['data.test-case', 'data.api-surface']),
      ),
    ).resolves.toBeUndefined();
  });

  it('should handle nested fields', async () => {
    shareTransactionalQueries.getTableSchema.mockResolvedValue({
      schema: getObjectSchema({
        metadata: getObjectSchema({
          title: getStringSchema(),
        }),
      }),
    } as any);

    await expect(
      service.validateViewsFields(
        'rev-1',
        'posts',
        makeViewsData(['data.metadata.title']),
      ),
    ).resolves.toBeUndefined();
  });

  it('should validate sort fields', async () => {
    shareTransactionalQueries.getTableSchema.mockResolvedValue({
      schema: getObjectSchema({
        name: getStringSchema(),
      }),
    } as any);

    await expect(
      service.validateViewsFields('rev-1', 'users', {
        version: 1,
        defaultViewId: 'view-1',
        views: [
          {
            id: 'view-1',
            name: 'Test',
            sorts: [{ field: 'data.missing', direction: 'asc' }],
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should validate filter fields', async () => {
    shareTransactionalQueries.getTableSchema.mockResolvedValue({
      schema: getObjectSchema({
        name: getStringSchema(),
      }),
    } as any);

    await expect(
      service.validateViewsFields('rev-1', 'users', {
        version: 1,
        defaultViewId: 'view-1',
        views: [
          {
            id: 'view-1',
            name: 'Test',
            filters: {
              logic: 'and',
              conditions: [
                { field: 'data.missing', operator: 'equals', value: 'x' },
              ],
            },
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
