import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { fileSchema } from 'src/features/share/schema/plugins/file-schema';

describe('file-schema', () => {
  const ajv = new Ajv();
  addFormats(ajv);

  it('invalid: empty object', () => {
    expect(ajv.validate(fileSchema, {})).toBe(false);
  });

  it('invalid: invalid hash', () => {
    const data = getValidFileData();
    data.hash = 0;
    expect(ajv.validate(fileSchema, data)).toBe(false);
  });

  it('invalid: invalid mimeType', () => {
    const data = getValidFileData();
    data.mimeType = false;
    expect(ajv.validate(fileSchema, data)).toBe(false);
  });

  it('invalid: invalid extension', () => {
    const data = getValidFileData();
    data.extension = 0;
    expect(ajv.validate(fileSchema, data)).toBe(false);
  });

  it('invalid: size', () => {
    const data = getValidFileData();
    data.size = '';
    expect(ajv.validate(fileSchema, data)).toBe(false);
  });

  it('invalid: width', () => {
    const data = getValidFileData();
    data.width = '12';
    expect(ajv.validate(fileSchema, data)).toBe(false);
  });

  it('invalid: height', () => {
    const data = getValidFileData();
    data.height = '-1';
    expect(ajv.validate(fileSchema, data)).toBe(false);
  });

  it('valid: full ready file', () => {
    const data = getValidFileData();
    expect(ajv.validate(fileSchema, data)).toBe(true);
  });

  function getValidFileData() {
    return {
      status: 'ready',
      url: 'https://example.com/file.png',
      filename: 'file.png',
      hash: 'a'.repeat(40),
      extension: 'png',
      mimeType: 'image/png',
      size: 1024,
      width: 800,
      height: 600,
    } as Record<string, unknown>;
  }
});
