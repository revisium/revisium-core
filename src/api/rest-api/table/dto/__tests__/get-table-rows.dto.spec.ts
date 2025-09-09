import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  SortDirection,
  SortField,
  JsonValueTypeEnum,
  JsonAggregationEnum,
} from 'src/api/rest-api/share/model/order-by.model';
import { findConstraint } from 'src/api/rest-api/table/dto/__tests__/utils';
import { GetTableRowsDto } from '../get-table-rows.dto';

describe('GetTableRowsDto', () => {
  it('valid orderBy with unique fields', async () => {
    const errors = await getErrors({
      first: 100,
      orderBy: [
        { field: SortField.id, direction: SortDirection.asc },
        { field: SortField.updatedAt, direction: SortDirection.desc },
      ],
    });
    expect(errors).toHaveLength(0);
  });

  it('should fail if fields are not unique', async () => {
    const input = {
      first: 100,
      orderBy: [
        { field: SortField.id, direction: SortDirection.asc },
        { field: SortField.id, direction: SortDirection.desc },
      ],
    };

    const instance = plainToInstance(GetTableRowsDto, input);
    const errors = await validate(instance);

    const error = errors.find((e) => e.property === 'orderBy');
    expect(error).toBeDefined();

    const message = error?.constraints?.isUniqueOrderByFields;
    expect(message).toBe('Each orderBy.field must be unique');
  });

  it('should allow duplicate data fields with different paths', async () => {
    const errors = await getErrors({
      first: 100,
      orderBy: [
        {
          field: SortField.data,
          direction: SortDirection.asc,
          path: 'user.name',
          type: JsonValueTypeEnum.text,
        },
        {
          field: SortField.data,
          direction: SortDirection.desc,
          path: 'user.age',
          type: JsonValueTypeEnum.int,
        },
      ],
    });
    expect(errors).toHaveLength(0);
  });

  it('should fail if data fields have the same path', async () => {
    const input = {
      first: 100,
      orderBy: [
        {
          field: SortField.data,
          direction: SortDirection.asc,
          path: 'user.name',
          type: JsonValueTypeEnum.text,
        },
        {
          field: SortField.data,
          direction: SortDirection.desc,
          path: 'user.name',
          type: JsonValueTypeEnum.text,
        },
      ],
    };

    const instance = plainToInstance(GetTableRowsDto, input);
    const errors = await validate(instance);

    const error = errors.find((e) => e.property === 'orderBy');
    expect(error).toBeDefined();

    const message = error?.constraints?.isUniqueOrderByFields;
    expect(message).toBe('Each orderBy.field must be unique');
  });

  it('empty orderBy should fail', async () => {
    const errors = await getErrors({ first: 100, orderBy: [] });
    expect(findConstraint(errors, 'orderBy', 'arrayNotEmpty')).toBeDefined();
  });

  it('missing orderBy should pass', async () => {
    const errors = await getErrors({ first: 100 });
    expect(errors).toHaveLength(0);
  });

  it('invalid field value should fail', async () => {
    const errors = await getErrors({
      first: 100,
      orderBy: [{ field: 'invalidField', direction: SortDirection.asc } as any],
    });

    expect(findConstraint(errors, 'field', 'isEnum')).toMatch(
      /field must be a valid SortField/i,
    );
  });

  it('should throw if orderBy is not valid JSON', async () => {
    expect(() =>
      plainToInstance(GetTableRowsDto, {
        first: 10,
        orderBy: '[invalid]',
      }),
    ).toThrow('`orderBy` must be valid JSON array');
  });

  it('should pass with valid where filter', async () => {
    const errors = await getErrors({
      first: 100,
      where: { id: { equals: 'row1' } },
    });
    expect(errors).toHaveLength(0);
  });

  it('should fail when where is an array', async () => {
    const errors = await getErrors({
      first: 1,
      where: [] as any,
    });
    const msg = findConstraint(errors, 'where', 'isObject');
    expect(msg).toBeDefined();
    expect(msg).toMatch(/where must be an object/);
  });

  describe('SortField.data validation', () => {
    it('should pass when field is data with path and type', async () => {
      const errors = await getErrors({
        first: 100,
        orderBy: [
          {
            field: SortField.data,
            direction: SortDirection.asc,
            path: 'user.name',
            type: JsonValueTypeEnum.text,
          },
        ],
      });
      expect(errors).toHaveLength(0);
    });

    it('should pass when field is data with path, type, and aggregation', async () => {
      const errors = await getErrors({
        first: 100,
        orderBy: [
          {
            field: SortField.data,
            direction: SortDirection.desc,
            path: 'user.age',
            type: JsonValueTypeEnum.int,
            aggregation: JsonAggregationEnum.max,
          },
        ],
      });
      expect(errors).toHaveLength(0);
    });

    it('should fail when field is data without path', async () => {
      const errors = await getErrors({
        first: 100,
        orderBy: [
          {
            field: SortField.data,
            direction: SortDirection.asc,
            type: JsonValueTypeEnum.text,
          },
        ],
      });
      const error = errors.find((e) => e.property === 'orderBy');
      expect(error?.constraints?.isValidDataFieldOrder).toBe(
        'When field is data, both path and type are required',
      );
    });

    it('should fail when field is data without type', async () => {
      const errors = await getErrors({
        first: 100,
        orderBy: [
          {
            field: SortField.data,
            direction: SortDirection.asc,
            path: 'user.name',
          },
        ],
      });
      const error = errors.find((e) => e.property === 'orderBy');
      expect(error?.constraints?.isValidDataFieldOrder).toBe(
        'When field is data, both path and type are required',
      );
    });

    it('should fail when field is data without path and type', async () => {
      const errors = await getErrors({
        first: 100,
        orderBy: [
          {
            field: SortField.data,
            direction: SortDirection.asc,
          },
        ],
      });
      const error = errors.find((e) => e.property === 'orderBy');
      expect(error?.constraints?.isValidDataFieldOrder).toBe(
        'When field is data, both path and type are required',
      );
    });

    it('should fail with invalid type enum', async () => {
      const errors = await getErrors({
        first: 100,
        orderBy: [
          {
            field: SortField.data,
            direction: SortDirection.asc,
            path: 'user.name',
            type: 'invalid' as any,
          },
        ],
      });
      expect(findConstraint(errors, 'type', 'isEnum')).toMatch(
        /type must be a valid JsonValueType/i,
      );
    });

    it('should fail with invalid aggregation enum', async () => {
      const errors = await getErrors({
        first: 100,
        orderBy: [
          {
            field: SortField.data,
            direction: SortDirection.asc,
            path: 'user.age',
            type: JsonValueTypeEnum.int,
            aggregation: 'invalid' as any,
          },
        ],
      });
      expect(findConstraint(errors, 'aggregation', 'isEnum')).toMatch(
        /aggregation must be a valid JsonAggregation/i,
      );
    });

    it('should allow non-data fields without path and type', async () => {
      const errors = await getErrors({
        first: 100,
        orderBy: [
          { field: SortField.createdAt, direction: SortDirection.desc },
          { field: SortField.id, direction: SortDirection.asc },
        ],
      });
      expect(errors).toHaveLength(0);
    });
  });

  const make = (input: Partial<GetTableRowsDto>) =>
    plainToInstance(GetTableRowsDto, input);

  const getErrors = async (input: Partial<GetTableRowsDto>) =>
    validate(make(input));
});
