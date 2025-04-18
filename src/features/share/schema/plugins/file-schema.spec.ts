import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { fileSchema } from 'src/features/share/schema/plugins/file-schema';

describe('file-schema', () => {
  const ajv = new Ajv({ discriminator: true });
  addFormats(ajv);

  beforeAll(() => {
    ajv.addSchema(fileSchema);
  });

  it('invalid: empty object', () => {
    expect(ajv.validate(fileSchema, {})).toBe(false);
  });

  it('valid: pending state', () => {
    const data = { status: 'pending' };
    expect(ajv.validate(fileSchema, data)).toBe(true);
  });

  it('valid: error state', () => {
    const data = {
      status: 'error',
      error: 'Something went wrong',
    };
    expect(ajv.validate(fileSchema, data)).toBe(true);
  });

  it('invalid: error without message', () => {
    const data = { status: 'error' };
    expect(ajv.validate(fileSchema, data)).toBe(false);
  });

  it('invalid: ready without fields', () => {
    const data = { status: 'ready' };
    expect(ajv.validate(fileSchema, data)).toBe(false);
  });

  it('invalid: invalid hash pattern', () => {
    const data = getValidFileData();
    data.hash = 'not-valid-hash';
    expect(ajv.validate(fileSchema, data)).toBe(false);
  });

  it('invalid: invalid mimeType pattern', () => {
    const data = getValidFileData();
    data.mimeType = 'invalid';
    expect(ajv.validate(fileSchema, data)).toBe(false);
  });

  it('invalid: invalid extension pattern', () => {
    const data = getValidFileData();
    data.extension = 'png!';
    expect(ajv.validate(fileSchema, data)).toBe(false);
  });

  it('invalid: negative size', () => {
    const data = getValidFileData();
    data.size = -100;
    expect(ajv.validate(fileSchema, data)).toBe(false);
  });

  it('invalid: negative width', () => {
    const data = getValidFileData();
    data.width = -1;
    expect(ajv.validate(fileSchema, data)).toBe(false);
  });

  it('invalid: negative height', () => {
    const data = getValidFileData();
    data.height = -1;
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
    };
  }
});
