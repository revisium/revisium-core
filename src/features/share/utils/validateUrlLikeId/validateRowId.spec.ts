import { BadRequestException } from '@nestjs/common';
import { validateRowId } from 'src/features/share/utils/validateUrlLikeId/validateRowId';

describe('validateRowId', () => {
  describe('valid row IDs', () => {
    it('should pass for simple names', () => {
      expect(() => validateRowId('validRowId')).not.toThrow();
      expect(() => validateRowId('row')).not.toThrow();
      expect(() => validateRowId('a')).not.toThrow();
    });

    it('should pass for names with underscores', () => {
      expect(() => validateRowId('_valid_row_123')).not.toThrow();
      expect(() => validateRowId('row_data')).not.toThrow();
    });

    it('should pass for names with hyphens', () => {
      expect(() => validateRowId('row-data')).not.toThrow();
      expect(() => validateRowId('row-123')).not.toThrow();
    });

    it('should pass for names starting with digit', () => {
      expect(() => validateRowId('1row')).not.toThrow();
      expect(() => validateRowId('10')).not.toThrow();
      expect(() => validateRowId('123')).not.toThrow();
      expect(() => validateRowId('1')).not.toThrow();
    });

    it('should pass for names starting with hyphen', () => {
      expect(() => validateRowId('-row')).not.toThrow();
      expect(() => validateRowId('-')).not.toThrow();
      expect(() => validateRowId('--test')).not.toThrow();
      expect(() => validateRowId('-123')).not.toThrow();
    });

    it('should pass for names starting with underscore', () => {
      expect(() => validateRowId('_private')).not.toThrow();
      expect(() => validateRowId('__row')).not.toThrow();
    });

    it('should pass for UUID-like formats', () => {
      expect(() => validateRowId('UUID-1234-5678')).not.toThrow();
      expect(() => validateRowId('a1b2c3d4-e5f6-7890')).not.toThrow();
    });

    it('should pass for max length names (64 chars)', () => {
      expect(() => validateRowId('a'.repeat(64))).not.toThrow();
    });
  });

  describe('invalid row IDs - unicode characters', () => {
    it('should fail for cyrillic characters', () => {
      expect(() => validateRowId('строка')).toThrow(BadRequestException);
      expect(() => validateRowId('row_данные')).toThrow(BadRequestException);
    });

    it('should fail for japanese characters', () => {
      expect(() => validateRowId('データ')).toThrow(BadRequestException);
    });

    it('should fail for chinese characters', () => {
      expect(() => validateRowId('行')).toThrow(BadRequestException);
    });

    it('should fail for emoji', () => {
      expect(() => validateRowId('row👍')).toThrow(BadRequestException);
    });
  });

  describe('invalid row IDs - special characters', () => {
    it('should fail for names with spaces', () => {
      expect(() => validateRowId('invalid row')).toThrow(BadRequestException);
      expect(() => validateRowId(' row')).toThrow(BadRequestException);
      expect(() => validateRowId('row ')).toThrow(BadRequestException);
    });

    it('should fail for names with special characters', () => {
      expect(() => validateRowId('invalid$row')).toThrow(BadRequestException);
      expect(() => validateRowId('row@data')).toThrow(BadRequestException);
      expect(() => validateRowId('row.data')).toThrow(BadRequestException);
      expect(() => validateRowId('row/data')).toThrow(BadRequestException);
      expect(() => validateRowId('row\\data')).toThrow(BadRequestException);
      expect(() => validateRowId('row:data')).toThrow(BadRequestException);
      expect(() => validateRowId('row*data')).toThrow(BadRequestException);
    });
  });

  describe('invalid row IDs - length constraints', () => {
    it('should fail for empty string', () => {
      expect(() => validateRowId('')).toThrow(BadRequestException);
    });

    it('should fail for names exceeding max length (65 chars)', () => {
      expect(() => validateRowId('a'.repeat(65))).toThrow(BadRequestException);
    });

    it('should fail for very long names', () => {
      expect(() => validateRowId('a'.repeat(100))).toThrow(BadRequestException);
    });
  });
});
