import { unquoteFieldPath } from 'src/features/sub-schema/utils/unquote-field-path';

describe('unquoteFieldPath', () => {
  it('passes through unquoted simple field', () => {
    expect(unquoteFieldPath('avatar')).toBe('avatar');
  });

  it('strips quotes from simple field', () => {
    expect(unquoteFieldPath('"avatar"')).toBe('avatar');
  });

  it('strips quotes from nested path', () => {
    expect(unquoteFieldPath('"media"."thumbnail"')).toBe('media.thumbnail');
  });

  it('strips quotes from hyphenated field', () => {
    expect(unquoteFieldPath('"test-case"')).toBe('test-case');
  });

  it('strips quotes from nested hyphenated path', () => {
    expect(unquoteFieldPath('"api-settings"."auth-token"')).toBe(
      'api-settings.auth-token',
    );
  });

  it('handles mixed quoted and unquoted segments', () => {
    expect(unquoteFieldPath('metadata."hero-banner"')).toBe(
      'metadata.hero-banner',
    );
  });

  it('passes through array notation unchanged', () => {
    expect(unquoteFieldPath('"images"[*]')).toBe('images[*]');
  });

  it('handles array path with trailing quoted key', () => {
    expect(unquoteFieldPath('"attachments"[*]."file"')).toBe(
      'attachments[*].file',
    );
  });
});
