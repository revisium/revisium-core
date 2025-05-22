import addFormats from 'ajv-formats';
import Ajv from 'ajv/dist/2020';
import { rowHashSchema } from 'src/features/share/schema/plugins/row-hash.schema';

describe('row-hash-schema', () => {
  const ajv = new Ajv();
  addFormats(ajv);

  it('base tests', () => {
    expect(ajv.validate(rowHashSchema, '')).toBe(true);
    expect(ajv.validate(rowHashSchema, 1)).toBe(false);
  });
});
