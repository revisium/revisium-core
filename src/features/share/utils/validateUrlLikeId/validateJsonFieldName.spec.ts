import { validateJsonFieldName } from 'src/features/share/utils/validateUrlLikeId/validateJsonFieldName';

describe('validateJsonFieldName', () => {
  it('should pass for valid json field', () => {
    expect(validateJsonFieldName('validFieldName')).toBe(true);
    expect(validateJsonFieldName('_valid_field_123')).toBe(true);
    expect(validateJsonFieldName('a')).toBe(true);
    expect(validateJsonFieldName('a'.repeat(64))).toBe(true);
  });

  it('should fail for json field that start with numbers or two underscores', () => {
    expect(validateJsonFieldName('1table')).toBe(false);
    expect(validateJsonFieldName('__table')).toBe(false);
  });

  it('should fail for json field with invalid characters', () => {
    expect(validateJsonFieldName('invalid$field')).toBe(false);
    expect(validateJsonFieldName('invalid field')).toBe(false);
  });

  it('should fail for json field that are too long', () => {
    expect(validateJsonFieldName('a'.repeat(65))).toBe(false);
  });

  it('should fail for empty json field', () => {
    expect(validateJsonFieldName('')).toBe(false);
  });
});
