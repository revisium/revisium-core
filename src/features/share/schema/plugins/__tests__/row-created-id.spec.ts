import addFormats from 'ajv-formats';
import Ajv from 'ajv/dist/2020';
import { rowCreatedIdSchema } from 'src/features/share/schema/plugins/row-created-id.schema';

describe('row-created-id-schema', () => {
  const ajv = new Ajv();
  addFormats(ajv);

  it('base tests', () => {
    expect(ajv.validate(rowCreatedIdSchema, '')).toBe(true);
    expect(ajv.validate(rowCreatedIdSchema, 1)).toBe(false);
  });
});
