import addFormats from 'ajv-formats';
import Ajv from 'ajv/dist/2020';
import { rowIdSchema } from 'src/features/share/schema/plugins/row-id.schema';

describe('row-id-schema', () => {
  const ajv = new Ajv();
  addFormats(ajv);

  it('base tests', () => {
    expect(ajv.validate(rowIdSchema, '')).toBe(true);
    expect(ajv.validate(rowIdSchema, 1)).toBe(false);
  });
});
