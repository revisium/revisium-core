import Ajv from 'ajv/dist/2020';
import { jsonPatchSchema } from 'src/features/share/schema/json-patch-schema';
import { metaSchema } from 'src/features/share/schema/meta-schema';

describe('json-patch-schema', () => {
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
  });

  it('empty', () => {
    expect(ajv.validate(jsonPatchSchema, [])).toBe(false);
  });

  it('add', () => {
    expect(ajv.validate(jsonPatchSchema, [{ op: 'add' }])).toBe(false);
    expect(ajv.validate(jsonPatchSchema, [{ op: 'add', path: '/path' }])).toBe(
      false,
    );
    expect(
      ajv.validate(jsonPatchSchema, [
        { op: 'add', path: '/path', value: { type: 'string', default: '' } },
      ]),
    ).toBe(true);
  });

  it('remove', () => {
    expect(ajv.validate(jsonPatchSchema, [{ op: 'remove' }])).toBe(false);
    expect(
      ajv.validate(jsonPatchSchema, [
        { op: 'remove', path: '/path', value: '' },
      ]),
    ).toBe(false);
    expect(
      ajv.validate(jsonPatchSchema, [{ op: 'remove', path: '/path' }]),
    ).toBe(true);
  });

  it('replace', () => {
    expect(ajv.validate(jsonPatchSchema, [{ op: 'replace' }])).toBe(false);
    expect(
      ajv.validate(jsonPatchSchema, [{ op: 'replace', path: '/path' }]),
    ).toBe(false);
    expect(
      ajv.validate(jsonPatchSchema, [
        { op: 'replace', path: '/path', value: { type: 'number', default: 0 } },
      ]),
    ).toBe(true);
  });

  it('move', () => {
    expect(ajv.validate(jsonPatchSchema, [{ op: 'move' }])).toBe(false);
    expect(ajv.validate(jsonPatchSchema, [{ op: 'move', from: '/path' }])).toBe(
      false,
    );
    expect(
      ajv.validate(jsonPatchSchema, [
        { op: 'move', from: '/path', path: '/path2' },
      ]),
    ).toBe(true);
  });

  it('copy', () => {
    expect(ajv.validate(jsonPatchSchema, [{ op: 'copy' }])).toBe(false);
    expect(ajv.validate(jsonPatchSchema, [{ op: 'copy', from: '/path' }])).toBe(
      false,
    );
    expect(
      ajv.validate(jsonPatchSchema, [
        { op: 'copy', from: '/path', path: '/path2' },
      ]),
    ).toBe(true);
  });
});
