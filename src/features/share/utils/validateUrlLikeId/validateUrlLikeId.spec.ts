import { BadRequestException } from '@nestjs/common';
import { validateUrlLikeId } from 'src/features/share/utils/validateUrlLikeId/validateUrlLikeId';

describe('validateTableId', () => {
  it('should pass for valid table IDs', () => {
    expect(() => validateUrlLikeId('validTableId')).not.toThrow();
    expect(() => validateUrlLikeId('_valid_table_123')).not.toThrow();
    expect(() => validateUrlLikeId('a')).not.toThrow();
    expect(() => validateUrlLikeId('a'.repeat(64))).not.toThrow();
  });

  it('should fail for table IDs that start with numbers or two underscores', () => {
    expect(() => validateUrlLikeId('1table')).toThrow(BadRequestException);
    expect(() => validateUrlLikeId('__table')).toThrow(BadRequestException);
  });

  it('should fail for table IDs with invalid characters', () => {
    expect(() => validateUrlLikeId('invalid$table')).toThrow(
      BadRequestException,
    );
    expect(() => validateUrlLikeId('invalid table')).toThrow(
      BadRequestException,
    );
  });

  it('should fail for table IDs that are too long', () => {
    expect(() => validateUrlLikeId('a'.repeat(65))).toThrow(
      BadRequestException,
    );
  });

  it('should fail for empty table IDs', () => {
    expect(() => validateUrlLikeId('')).toThrow(BadRequestException);
  });
});
