import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  SortDirection,
  SortField,
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

  const make = (input: Partial<GetTableRowsDto>) =>
    plainToInstance(GetTableRowsDto, input);

  const getErrors = async (input: Partial<GetTableRowsDto>) =>
    validate(make(input));
});
