import Ajv from 'ajv/dist/2020';
import { jsonPatchSchema } from 'src/features/share/schema/json-patch-schema';

describe('json-patch-schema', () => {
  const ajv = new Ajv();

  it('empty', () => {
    expect(ajv.validate(jsonPatchSchema, [])).toBe(true);
  });

  it('add', () => {
    expect(ajv.validate(jsonPatchSchema, [{ op: 'add' }])).toBe(false);
    expect(ajv.validate(jsonPatchSchema, [{ op: 'add', path: '/path' }])).toBe(
      false,
    );
    expect(
      ajv.validate(jsonPatchSchema, [{ op: 'add', path: '/path', value: '' }]),
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
        { op: 'replace', path: '/path', value: '' },
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
