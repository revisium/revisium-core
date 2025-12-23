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

  it('should pass with path as string', async () => {
    const dto = plainToInstance(JsonFilterDto, { path: 'x.y' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with path as string with wildcard', async () => {
    const dto = plainToInstance(JsonFilterDto, { path: 'products.*.price' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
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

  describe('search fields', () => {
    it('should pass with search string', async () => {
      const dto = plainToInstance(JsonFilterDto, {
        search: 'test query',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with searchLanguage', async () => {
      const dto = plainToInstance(JsonFilterDto, {
        search: 'test',
        searchLanguage: 'english',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid searchType plain', async () => {
      const dto = plainToInstance(JsonFilterDto, {
        search: 'test',
        searchType: 'plain',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid searchType phrase', async () => {
      const dto = plainToInstance(JsonFilterDto, {
        search: 'test phrase',
        searchType: 'phrase',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid searchType prefix', async () => {
      const dto = plainToInstance(JsonFilterDto, {
        search: 'test pre',
        searchType: 'prefix',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid searchType tsquery', async () => {
      const dto = plainToInstance(JsonFilterDto, {
        search: 'test:* & query',
        searchType: 'tsquery',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid searchType', async () => {
      const dto = plainToInstance(JsonFilterDto, {
        search: 'test',
        searchType: 'invalid' as any,
      });
      const errors = await validate(dto);
      expect(findConstraint(errors, 'searchType', 'isIn')).toBeDefined();
    });

    it('should pass with valid searchIn all', async () => {
      const dto = plainToInstance(JsonFilterDto, {
        search: 'test',
        searchIn: 'all',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid searchIn values', async () => {
      const dto = plainToInstance(JsonFilterDto, {
        search: 'test',
        searchIn: 'values',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid searchIn keys', async () => {
      const dto = plainToInstance(JsonFilterDto, {
        search: 'test',
        searchIn: 'keys',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid searchIn strings', async () => {
      const dto = plainToInstance(JsonFilterDto, {
        search: 'test',
        searchIn: 'strings',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid searchIn numbers', async () => {
      const dto = plainToInstance(JsonFilterDto, {
        search: '42',
        searchIn: 'numbers',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid searchIn booleans', async () => {
      const dto = plainToInstance(JsonFilterDto, {
        search: 'true',
        searchIn: 'booleans',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid searchIn', async () => {
      const dto = plainToInstance(JsonFilterDto, {
        search: 'test',
        searchIn: 'invalid' as any,
      });
      const errors = await validate(dto);
      expect(findConstraint(errors, 'searchIn', 'isIn')).toBeDefined();
    });

    it('should pass with all search fields combined', async () => {
      const dto = plainToInstance(JsonFilterDto, {
        search: 'test query',
        searchLanguage: 'english',
        searchType: 'phrase',
        searchIn: 'values',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
