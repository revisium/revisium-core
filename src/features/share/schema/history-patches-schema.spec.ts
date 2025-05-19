import Ajv from 'ajv/dist/2020';
import { historyPatchesSchema } from 'src/features/share/schema/history-patches-schema';
import { jsonPatchSchema } from 'src/features/share/schema/json-patch-schema';
import { metaSchema } from 'src/features/share/schema/meta-schema';

describe('history-patches-schema', () => {
  const ajv = new Ajv();
  ajv.addFormat('regex', {
    type: 'string',
    validate: (str: string) => {
      try {
        new RegExp(str);
        return true;
      } catch {
        return false;
      }
    },
  });

  beforeAll(() => {
    ajv.addSchema(metaSchema);
    ajv.addSchema(jsonPatchSchema);
  });

  it('empty', () => {
    expect(ajv.validate(historyPatchesSchema, [])).toBe(false);
  });

  it('not hash', () => {
    expect(
      ajv.validate(historyPatchesSchema, [{ patches: [{ op: 'add' }] }]),
    ).toBe(false);
  });

  it('not patches', () => {
    expect(
      ajv.validate(historyPatchesSchema, [
        {
          hash: 'hash',
        },
      ]),
    ).toBe(false);
  });

  it('empty patches', () => {
    expect(
      ajv.validate(historyPatchesSchema, [
        {
          patches: [],
          hash: 'hash',
        },
      ]),
    ).toBe(false);
  });

  it('invalid patch', () => {
    expect(
      ajv.validate(historyPatchesSchema, [
        {
          patches: [{ op: 'add', path: '/path' }],
          hash: 'hash',
        },
      ]),
    ).toBe(false);
  });

  it('valid', () => {
    expect(
      ajv.validate(historyPatchesSchema, [
        {
          patches: [
            {
              op: 'add',
              path: '/path',
              value: { type: 'string', default: '' },
            },
          ],
          hash: 'hash',
        },
      ]),
    ).toBe(true);
  });
});
