import addFormats from 'ajv-formats';
import Ajv from 'ajv/dist/2020';
import { rowVersionIdSchema } from 'src/features/share/schema/plugins/row-version-id.schema';

describe('row-version-id-schema', () => {
  const ajv = new Ajv();
  addFormats(ajv);

  it('base tests', () => {
    expect(ajv.validate(rowVersionIdSchema, '')).toBe(true);
    expect(ajv.validate(rowVersionIdSchema, 1)).toBe(false);
  });
});
