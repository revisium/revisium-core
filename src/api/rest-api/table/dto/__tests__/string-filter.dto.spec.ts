import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { findConstraint } from 'src/api/rest-api/table/dto/__tests__/utils';
import { StringFilterDto } from '../row/string-filter.dto';

describe('StringFilterDto', () => {
  it('should pass with valid equals', async () => {
    const dto = plainToInstance(StringFilterDto, { equals: 'text' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when equals is not a string', async () => {
    const dto = plainToInstance(StringFilterDto, { equals: 123 as any });
    const errors = await validate(dto);
    expect(findConstraint(errors, 'equals', 'isString')).toBeDefined();
  });

  it('should pass with valid in array of strings', async () => {
    const dto = plainToInstance(StringFilterDto, { in: ['a', 'b'] });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when in is empty array', async () => {
    const dto = plainToInstance(StringFilterDto, { in: [] });
    const errors = await validate(dto);
    expect(findConstraint(errors, 'in', 'arrayNotEmpty')).toBeDefined();
  });

  it('should fail when in contains non-string', async () => {
    const dto = plainToInstance(StringFilterDto, { in: ['a', 1 as any] });
    const errors = await validate(dto);
    expect(findConstraint(errors, 'in', 'isString')).toBeDefined();
  });

  it('should pass with valid notIn array of strings', async () => {
    const dto = plainToInstance(StringFilterDto, { notIn: ['x'] });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when notIn contains non-string', async () => {
    const dto = plainToInstance(StringFilterDto, { notIn: [true as any] });
    const errors = await validate(dto);
    expect(findConstraint(errors, 'notIn', 'isString')).toBeDefined();
  });

  it('should pass with valid lt/lte/gt/gte strings', async () => {
    const dto = plainToInstance(StringFilterDto, {
      lt: 'a',
      lte: 'b',
      gt: 'c',
      gte: 'd',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when lt is not a string', async () => {
    const dto = plainToInstance(StringFilterDto, { lt: 5 as any });
    const errors = await validate(dto);
    expect(findConstraint(errors, 'lt', 'isString')).toBeDefined();
  });

  it('should pass with valid contains, startsWith, endsWith', async () => {
    const dto = plainToInstance(StringFilterDto, {
      contains: 'mid',
      startsWith: 'pre',
      endsWith: 'suf',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when contains is not a string', async () => {
    const dto = plainToInstance(StringFilterDto, { contains: 123 as any });
    const errors = await validate(dto);
    expect(findConstraint(errors, 'contains', 'isString')).toBeDefined();
  });

  it('should pass with valid mode value', async () => {
    const dto = plainToInstance(StringFilterDto, { mode: 'insensitive' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when mode is invalid', async () => {
    const dto = plainToInstance(StringFilterDto, { mode: 'bad' as any });
    const errors = await validate(dto);
    expect(findConstraint(errors, 'mode', 'isIn')).toBeDefined();
  });

  it('should pass with valid not string', async () => {
    const dto = plainToInstance(StringFilterDto, { not: 'neg' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when not is not a string', async () => {
    const dto = plainToInstance(StringFilterDto, { not: 123 as any });
    const errors = await validate(dto);
    expect(findConstraint(errors, 'not', 'isString')).toBeDefined();
  });
});
