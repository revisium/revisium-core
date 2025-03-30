import { BadRequestException } from '@nestjs/common';
import { validateRowId } from 'src/features/share/utils/validateUrlLikeId/validateRowId';

describe('validateRowId', () => {
  it('should pass for valid row IDs', () => {
    expect(() => validateRowId('validRowId')).not.toThrow();
    expect(() => validateRowId('_valid_row_123')).not.toThrow();
    expect(() => validateRowId('a')).not.toThrow();
    expect(() => validateRowId('a'.repeat(64))).not.toThrow();
    expect(() => validateRowId('1row')).not.toThrow();
    expect(() => validateRowId('10')).not.toThrow();
    expect(() => validateRowId('__row')).not.toThrow();
  });

  it('should fail for row IDs with invalid characters', () => {
    expect(() => validateRowId('invalid$row')).toThrow(BadRequestException);
    expect(() => validateRowId('invalid row')).toThrow(BadRequestException);
  });

  it('should fail for row IDs that are too long', () => {
    expect(() => validateRowId('a'.repeat(65))).toThrow(BadRequestException);
  });

  it('should fail for empty row IDs', () => {
    expect(() => validateRowId('')).toThrow(BadRequestException);
  });
});
