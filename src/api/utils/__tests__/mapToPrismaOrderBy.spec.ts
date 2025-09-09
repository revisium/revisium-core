import {
  SortDirection,
  SortField,
  JsonValueTypeEnum,
  JsonAggregationEnum,
  OrderByDto,
} from 'src/api/rest-api/share/model/order-by.model';
import { mapToPrismaOrderBy } from '../mapToPrismaOrderBy';

describe('mapToPrismaOrderBy', () => {
  it('should return undefined when orderBy is not provided', () => {
    const result = mapToPrismaOrderBy();
    expect(result).toBeUndefined();
  });

  it('should return undefined when orderBy is undefined', () => {
    const result = mapToPrismaOrderBy(undefined);
    expect(result).toBeUndefined();
  });

  it('should map simple field orderBy correctly', () => {
    const orderBy: OrderByDto[] = [
      { field: SortField.createdAt, direction: SortDirection.desc },
      { field: SortField.id, direction: SortDirection.asc },
    ];

    const result = mapToPrismaOrderBy(orderBy);

    expect(result).toEqual([{ createdAt: 'desc' }, { id: 'asc' }]);
  });

  it('should map all simple fields correctly', () => {
    const orderBy: OrderByDto[] = [
      { field: SortField.createdAt, direction: SortDirection.asc },
      { field: SortField.updatedAt, direction: SortDirection.desc },
      { field: SortField.publishedAt, direction: SortDirection.asc },
      { field: SortField.id, direction: SortDirection.desc },
    ];

    const result = mapToPrismaOrderBy(orderBy);

    expect(result).toEqual([
      { createdAt: 'asc' },
      { updatedAt: 'desc' },
      { publishedAt: 'asc' },
      { id: 'desc' },
    ]);
  });

  describe('data field mapping', () => {
    it('should requires path and type', () => {
      const orderBy: OrderByDto[] = [
        {
          field: SortField.data,
          direction: SortDirection.asc,
        },
      ];

      expect(() => mapToPrismaOrderBy(orderBy)).toThrow(
        "OrderByField.data requires both 'path' and 'type'.",
      );
    });

    it('should map data field with required properties', () => {
      const orderBy: OrderByDto[] = [
        {
          field: SortField.data,
          direction: SortDirection.asc,
          path: 'user.name',
          type: JsonValueTypeEnum.text,
        },
      ];

      const result = mapToPrismaOrderBy(orderBy);

      expect(result).toEqual([
        {
          data: {
            path: 'user.name',
            direction: 'asc',
            type: 'text',
            aggregation: undefined,
          },
        },
      ]);
    });

    it('should map data field with aggregation', () => {
      const orderBy: OrderByDto[] = [
        {
          field: SortField.data,
          direction: SortDirection.desc,
          path: 'user.age',
          type: JsonValueTypeEnum.int,
          aggregation: JsonAggregationEnum.max,
        },
      ];

      const result = mapToPrismaOrderBy(orderBy);

      expect(result).toEqual([
        {
          data: {
            path: 'user.age',
            direction: 'desc',
            type: 'int',
            aggregation: 'max',
          },
        },
      ]);
    });

    it('should handle all JsonValueType enum values', () => {
      const orderByItems = Object.values(JsonValueTypeEnum).map(
        (type, index) => ({
          field: SortField.data,
          direction: index % 2 === 0 ? SortDirection.asc : SortDirection.desc,
          path: `field${index}`,
          type,
        }),
      );

      const result = mapToPrismaOrderBy(orderByItems);

      expect(result).toHaveLength(5);
      expect(result![0]).toEqual({
        data: {
          path: 'field0',
          direction: 'asc',
          type: 'text',
          aggregation: undefined,
        },
      });
      expect(result![1]).toEqual({
        data: {
          path: 'field1',
          direction: 'desc',
          type: 'int',
          aggregation: undefined,
        },
      });
    });

    it('should handle all JsonAggregation enum values', () => {
      const orderByItems = Object.values(JsonAggregationEnum).map(
        (aggregation) => ({
          field: SortField.data,
          direction: SortDirection.asc,
          path: 'test.field',
          type: JsonValueTypeEnum.int,
          aggregation,
        }),
      );

      const result = mapToPrismaOrderBy(orderByItems);

      expect(result).toHaveLength(5);
      expect(result!.map((r) => (r as any).data.aggregation)).toEqual([
        'min',
        'max',
        'avg',
        'first',
        'last',
      ]);
    });
  });

  it('should map mixed field types correctly', () => {
    const orderBy: OrderByDto[] = [
      { field: SortField.createdAt, direction: SortDirection.desc },
      {
        field: SortField.data,
        direction: SortDirection.asc,
        path: 'user.name',
        type: JsonValueTypeEnum.text,
      },
      { field: SortField.id, direction: SortDirection.asc },
      {
        field: SortField.data,
        direction: SortDirection.desc,
        path: 'user.score',
        type: JsonValueTypeEnum.float,
        aggregation: JsonAggregationEnum.avg,
      },
    ];

    const result = mapToPrismaOrderBy(orderBy);

    expect(result).toEqual([
      { createdAt: 'desc' },
      {
        data: {
          path: 'user.name',
          direction: 'asc',
          type: 'text',
          aggregation: undefined,
        },
      },
      { id: 'asc' },
      {
        data: {
          path: 'user.score',
          direction: 'desc',
          type: 'float',
          aggregation: 'avg',
        },
      },
    ]);
  });

  it('should handle nested JSON paths', () => {
    const orderBy: OrderByDto[] = [
      {
        field: SortField.data,
        direction: SortDirection.asc,
        path: 'user.profile.settings.theme',
        type: JsonValueTypeEnum.text,
      },
    ];

    const result = mapToPrismaOrderBy(orderBy);

    expect(result).toEqual([
      {
        data: {
          path: 'user.profile.settings.theme',
          direction: 'asc',
          type: 'text',
          aggregation: undefined,
        },
      },
    ]);
  });
});
