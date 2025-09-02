import {
  parseJsonPath,
  getSqlType,
  validateJsonPath,
  hasArrayWildcard,
  buildJsonPathParam,
  handleArrayAggregation,
  splitPathAtWildcard,
  findWildcardIndex,
} from '../json-path';

describe('JSON Path Utilities', () => {
  describe('parseJsonPath', () => {
    it('should parse simple field names', () => {
      expect(parseJsonPath('name')).toEqual(['name']);
      expect(parseJsonPath('age')).toEqual(['age']);
    });

    it('should parse dot notation paths', () => {
      expect(parseJsonPath('user.name')).toEqual(['user', 'name']);
      expect(parseJsonPath('profile.settings.theme')).toEqual([
        'profile',
        'settings',
        'theme',
      ]);
    });

    it('should parse JSONPath with $. prefix', () => {
      expect(parseJsonPath('$.name')).toEqual(['name']);
      expect(parseJsonPath('$.user.profile')).toEqual(['user', 'profile']);
    });

    it('should parse array access notation', () => {
      expect(parseJsonPath('tags[0]')).toEqual(['tags', '0']);
      expect(parseJsonPath('tags[-1]')).toEqual(['tags', '-1']);
      expect(parseJsonPath('users[5].name')).toEqual(['users', '5', 'name']);
    });

    it('should parse complex JSONPath expressions', () => {
      expect(parseJsonPath('$.users[0].profile.name')).toEqual([
        'users',
        '0',
        'profile',
        'name',
      ]);
      expect(parseJsonPath('items[*].price')).toEqual(['items', '*', 'price']);
      expect(parseJsonPath('$.data[10].nested[0].field')).toEqual([
        'data',
        '10',
        'nested',
        '0',
        'field',
      ]);
    });

    it('should handle empty path', () => {
      expect(parseJsonPath('')).toEqual([]);
    });

    it('should handle single character fields', () => {
      expect(parseJsonPath('x')).toEqual(['x']);
      expect(parseJsonPath('a.b.c')).toEqual(['a', 'b', 'c']);
    });

    it('should throw error for non-string input', () => {
      expect(() => parseJsonPath(123 as any)).toThrow(
        'JSON path must be a string',
      );
      expect(() => parseJsonPath(null as any)).toThrow(
        'JSON path must be a string',
      );
    });
  });

  describe('getSqlType', () => {
    it('should return correct SQL types', () => {
      expect(getSqlType('text')).toBe('text');
      expect(getSqlType('int')).toBe('int');
      expect(getSqlType('float')).toBe('float');
      expect(getSqlType('boolean')).toBe('boolean');
      expect(getSqlType('timestamp')).toBe('timestamp');
    });

    it('should default unknown types to text', () => {
      expect(getSqlType('unknown')).toBe('text');
      expect(getSqlType('invalid')).toBe('text');
      expect(getSqlType('')).toBe('text');
    });

    it('should log warning for unknown types in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      getSqlType('unknown');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Unknown JSON type "unknown", defaulting to "text"',
      );

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('validateJsonPath', () => {
    it('should accept valid path arrays', () => {
      expect(() => validateJsonPath(['name'])).not.toThrow();
      expect(() => validateJsonPath(['user', 'profile', 'name'])).not.toThrow();
      expect(() => validateJsonPath(['tags', '0'])).not.toThrow();
    });

    it('should throw error for non-array input', () => {
      expect(() => validateJsonPath('name' as any)).toThrow(
        'JSON path must be an array',
      );
      expect(() => validateJsonPath(null as any)).toThrow(
        'JSON path must be an array',
      );
    });

    it('should throw error for empty path', () => {
      expect(() => validateJsonPath([])).toThrow('JSON path cannot be empty');
    });

    it('should throw error for non-string segments', () => {
      expect(() => validateJsonPath(['name', 123 as any])).toThrow(
        'All JSON path segments must be strings',
      );
      expect(() => validateJsonPath([null as any])).toThrow(
        'All JSON path segments must be strings',
      );
    });
  });

  describe('hasArrayWildcard', () => {
    it('should detect wildcard in string paths', () => {
      expect(hasArrayWildcard('items[*].price')).toBe(true);
      expect(hasArrayWildcard('$.users[*].name')).toBe(true);
      expect(hasArrayWildcard('data.array[*]')).toBe(true);
    });

    it('should detect wildcard in array paths', () => {
      expect(hasArrayWildcard(['items', '*', 'price'])).toBe(true);
      expect(hasArrayWildcard(['users', '*'])).toBe(true);
    });

    it('should return false for paths without wildcards', () => {
      expect(hasArrayWildcard('name')).toBe(false);
      expect(hasArrayWildcard('user.profile.name')).toBe(false);
      expect(hasArrayWildcard('tags[0]')).toBe(false);
      expect(hasArrayWildcard(['user', 'name'])).toBe(false);
    });
  });

  describe('buildJsonPathParam', () => {
    it('should build PostgreSQL path format', () => {
      expect(buildJsonPathParam(['name'])).toBe('{name}');
      expect(buildJsonPathParam(['user', 'profile'])).toBe('{user,profile}');
      expect(buildJsonPathParam(['tags', '0'])).toBe('{tags,0}');
    });

    it('should validate input before building', () => {
      expect(() => buildJsonPathParam([])).toThrow('JSON path cannot be empty');
      expect(() => buildJsonPathParam([123 as any])).toThrow(
        'All JSON path segments must be strings',
      );
    });
  });

  describe('handleArrayAggregation', () => {
    it('should add -1 for last aggregation', () => {
      expect(handleArrayAggregation(['scores'], 'last')).toEqual([
        'scores',
        '-1',
      ]);
      expect(handleArrayAggregation(['data', 'values'], 'last')).toEqual([
        'data',
        'values',
        '-1',
      ]);
    });

    it('should add 0 for other aggregation types', () => {
      expect(handleArrayAggregation(['scores'], 'first')).toEqual([
        'scores',
        '0',
      ]);
      expect(handleArrayAggregation(['scores'], 'min')).toEqual([
        'scores',
        '0',
      ]);
      expect(handleArrayAggregation(['scores'], 'max')).toEqual([
        'scores',
        '0',
      ]);
      expect(handleArrayAggregation(['scores'], 'avg')).toEqual([
        'scores',
        '0',
      ]);
    });

    it('should not modify original array', () => {
      const originalPath = ['scores'];
      const result = handleArrayAggregation(originalPath, 'last');
      expect(originalPath).toEqual(['scores']); // Should be unchanged
      expect(result).toEqual(['scores', '-1']);
    });
  });

  describe('splitPathAtWildcard', () => {
    it('should split path at wildcard position', () => {
      const result = splitPathAtWildcard(['items', '*', 'price']);
      expect(result).toEqual({
        beforeStar: ['items'],
        afterStar: ['price'],
        starIndex: 1,
      });
    });

    it('should handle path without wildcard', () => {
      const result = splitPathAtWildcard(['user', 'name']);
      expect(result).toEqual({
        beforeStar: ['user', 'name'],
        afterStar: [],
        starIndex: -1,
      });
    });

    it('should handle wildcard at end', () => {
      const result = splitPathAtWildcard(['tags', '*']);
      expect(result).toEqual({
        beforeStar: ['tags'],
        afterStar: [],
        starIndex: 1,
      });
    });

    it('should handle wildcard at beginning', () => {
      const result = splitPathAtWildcard(['*', 'field']);
      expect(result).toEqual({
        beforeStar: [],
        afterStar: ['field'],
        starIndex: 0,
      });
    });
  });

  describe('findWildcardIndex', () => {
    it('should find wildcard position', () => {
      expect(findWildcardIndex(['items', '*', 'price'])).toBe(1);
      expect(findWildcardIndex(['*', 'field'])).toBe(0);
      expect(findWildcardIndex(['tags', '*'])).toBe(1);
    });

    it('should return -1 when no wildcard found', () => {
      expect(findWildcardIndex(['user', 'name'])).toBe(-1);
      expect(findWildcardIndex(['simple'])).toBe(-1);
    });
  });
});
