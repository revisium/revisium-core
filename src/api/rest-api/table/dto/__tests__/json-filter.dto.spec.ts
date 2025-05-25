import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { findConstraint } from 'src/api/rest-api/table/dto/__tests__/utils';
import { JsonFilterDto } from '../row/json-filter.dto';

describe('JsonFilterDto', () => {
  it('should pass with simple equals object', async () => {
    const dto = plainToInstance(JsonFilterDto, { equals: { a: 1 } });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with path array of strings', async () => {
    const dto = plainToInstance(JsonFilterDto, { path: ['x', 'y'] });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when path contains non-string', async () => {
    const dto = plainToInstance(JsonFilterDto, { path: ['x', 1 as any] });
    const errors = await validate(dto);
    expect(findConstraint(errors, 'path', 'isString')).toBeDefined();
  });

  it('should pass with array_contains array of any', async () => {
    const dto = plainToInstance(JsonFilterDto, {
      array_contains: [{ foo: 'bar' }, 42],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when array_contains is not array', async () => {
    const dto = plainToInstance(JsonFilterDto, {
      array_contains: 'oops' as any,
    });
    const errors = await validate(dto);
    expect(findConstraint(errors, 'array_contains', 'isArray')).toBeDefined();
  });

  it('should pass with numeric comparisons', async () => {
    const dto = plainToInstance(JsonFilterDto, {
      lt: 1,
      lte: 2,
      gt: 3,
      gte: 4,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when numeric comparisons are wrong type', async () => {
    const dto = plainToInstance(JsonFilterDto, {
      lt: 'low' as any,
    });
    const errors = await validate(dto);
    expect(findConstraint(errors, 'lt', 'isNumber')).toBeDefined();
  });

  it('should pass with nested not filter', async () => {
    const dto = plainToInstance(JsonFilterDto, {
      not: { equals: 'x' },
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
