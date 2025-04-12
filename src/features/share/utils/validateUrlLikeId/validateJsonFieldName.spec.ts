import { BadRequestException } from '@nestjs/common';
import { validateJsonFieldName } from 'src/features/share/utils/validateUrlLikeId/validateJsonFieldName';

describe('validateJsonFieldName', () => {
  it('should pass for valid json field', () => {
    expect(() => validateJsonFieldName('validFieldName')).not.toThrow();
    expect(() => validateJsonFieldName('_valid_field_123')).not.toThrow();
    expect(() => validateJsonFieldName('a')).not.toThrow();
    expect(() => validateJsonFieldName('a'.repeat(64))).not.toThrow();
  });

  it('should fail for json field that start with numbers or two underscores', () => {
    expect(() => validateJsonFieldName('1table')).toThrow(BadRequestException);
    expect(() => validateJsonFieldName('__table')).toThrow(BadRequestException);
  });

  it('should fail for json field with invalid characters', () => {
    expect(() => validateJsonFieldName('invalid$field')).toThrow(
      BadRequestException,
    );
    expect(() => validateJsonFieldName('invalid field')).toThrow(
      BadRequestException,
    );
  });

  it('should fail for json field that are too long', () => {
    expect(() => validateJsonFieldName('a'.repeat(65))).toThrow(
      BadRequestException,
    );
  });

  it('should fail for empty json field', () => {
    expect(() => validateJsonFieldName('')).toThrow(BadRequestException);
  });
});
