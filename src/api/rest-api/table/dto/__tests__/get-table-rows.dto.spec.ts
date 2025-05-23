import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  SortDirection,
  SortField,
} from 'src/api/rest-api/share/model/order-by.model';
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

    expect(findConstraint(errors, 'orderBy.0.field', 'isEnum')).toMatch(
      /must be one of the following values/i,
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
  const make = (input: Partial<GetTableRowsDto>) =>
    plainToInstance(GetTableRowsDto, input);

  const getErrors = async (input: Partial<GetTableRowsDto>) =>
    validate(make(input));

  const findConstraint = (
    errors: ValidationError[],
    path: string,
    constraintKey: string,
  ): string | undefined => {
    const parts = path.split('.');
    let node: ValidationError | undefined = errors.find(
      (e) => e.property === parts[0],
    );

    for (let i = 1; i < parts.length && node; i++) {
      const part = parts[i];
      if (node.children) {
        node = !isNaN(Number(part))
          ? node.children[Number(part)]
          : node.children.find((c) => c.property === part);
      }
    }

    return node?.constraints?.[constraintKey];
  };
});
