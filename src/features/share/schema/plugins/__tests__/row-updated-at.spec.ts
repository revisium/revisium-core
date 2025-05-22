import addFormats from 'ajv-formats';
import Ajv from 'ajv/dist/2020';
import { rowUpdatedAtSchema } from 'src/features/share/schema/plugins/row-updated-at.schema';

describe('row-updated-at-schema', () => {
  const ajv = new Ajv();
  addFormats(ajv);

  it('base tests', () => {
    expect(ajv.validate(rowUpdatedAtSchema, '')).toBe(true);
    expect(ajv.validate(rowUpdatedAtSchema, 1)).toBe(false);
  });
});
