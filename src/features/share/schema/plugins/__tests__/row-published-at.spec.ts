import addFormats from 'ajv-formats';
import Ajv from 'ajv/dist/2020';
import { rowPublishedAtSchema } from '../row-published-at.schema';

describe('row-published-at-schema', () => {
  const ajv = new Ajv();
  addFormats(ajv);

  it('base tests', () => {
    expect(ajv.validate(rowPublishedAtSchema, '')).toBe(true);
    expect(ajv.validate(rowPublishedAtSchema, 1)).toBe(false);
  });
});
