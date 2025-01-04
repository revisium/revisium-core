import Ajv from 'ajv/dist/2020';
import {
  metaSchema,
  notReferenceMetaSchema,
} from 'src/features/share/schema/meta-schema';

describe('meta-schema', () => {
  const ajv = new Ajv();
  ajv.addKeyword({
    keyword: 'isValidTableReference',
    type: 'string',
    validate: () => {
      return true;
    },
  });

  it('itself', () => {
    expect(ajv.validate(metaSchema, metaSchema)).toBe(false);
  });

  it('empty', () => {
    expect(ajv.validate(metaSchema, {})).toBe(false);
  });

  it('string', () => {
    expect(
      ajv.validate(metaSchema, { type: 'string', default: 'default value' }),
    ).toBe(true);

    expect(
      ajv.validate(metaSchema, {
        type: 'string',
        default: 'default value',
        reference: 'tableId',
      }),
    ).toBe(true);

    expect(ajv.validate(metaSchema, { type: 'string', default: 0 })).toBe(
      false,
    );

    expect(ajv.validate(metaSchema, { type: 'string' })).toBe(false);

    expect(
      ajv.validate(metaSchema, {
        type: 'string',
        default: 'default value',
        unexpectedField: 'test',
      }),
    ).toBe(false);

    expect(
      ajv.validate(metaSchema, {
        type: 'string',
        default: 'default value',
        reference: 1,
      }),
    ).toBe(false);
  });

  it('string no reference', () => {
    expect(
      ajv.validate(notReferenceMetaSchema, {
        type: 'string',
        default: 'default value',
      }),
    ).toBe(true);

    expect(
      ajv.validate(notReferenceMetaSchema, {
        type: 'string',
        default: 'default value',
        reference: 'tableId',
      }),
    ).toBe(false);

    expect(
      ajv.validate(notReferenceMetaSchema, { type: 'string', default: 0 }),
    ).toBe(false);

    expect(ajv.validate(notReferenceMetaSchema, { type: 'string' })).toBe(
      false,
    );

    expect(
      ajv.validate(notReferenceMetaSchema, {
        type: 'string',
        default: 'default value',
        unexpectedField: 'test',
      }),
    ).toBe(false);

    expect(
      ajv.validate(notReferenceMetaSchema, {
        type: 'string',
        default: 'default value',
        reference: 1,
      }),
    ).toBe(false);
  });

  it('number', () => {
    expect(ajv.validate(metaSchema, { type: 'number', default: 123 })).toBe(
      true,
    );
    expect(
      ajv.validate(metaSchema, { type: 'number', default: 'default value' }),
    ).toBe(false);
    expect(ajv.validate(metaSchema, { type: 'number' })).toBe(false);
    expect(ajv.validate(metaSchema, { type: 'number', properties: {} })).toBe(
      false,
    );
    expect(
      ajv.validate(metaSchema, {
        type: 'number',
        default: 123,
        unexpectedField: 123,
      }),
    ).toBe(false);
  });

  it('boolean', () => {
    expect(ajv.validate(metaSchema, { type: 'boolean', default: false })).toBe(
      true,
    );
    expect(ajv.validate(metaSchema, { type: 'boolean', default: true })).toBe(
      true,
    );
    expect(ajv.validate(metaSchema, { type: 'boolean', default: 'true' })).toBe(
      false,
    );
    expect(ajv.validate(metaSchema, { type: 'boolean' })).toBe(false);
    expect(
      ajv.validate(metaSchema, {
        type: 'boolean',
        default: true,
        unexpectedField: 123,
      }),
    ).toBe(false);
  });

  it('object', () => {
    expect(ajv.validate(metaSchema, { type: 'object' })).toBe(false);
    expect(
      ajv.validate(metaSchema, { type: 'object', additionalProperties: false }),
    ).toBe(false);
    expect(
      ajv.validate(metaSchema, {
        type: 'object',
        additionalProperties: false,
        properties: {},
      }),
    ).toBe(false);
    expect(
      ajv.validate(metaSchema, {
        type: 'object',
        additionalProperties: true,
        properties: {},
        required: [],
      }),
    ).toBe(false);
    expect(
      ajv.validate(metaSchema, {
        type: 'object',
        additionalProperties: false,
        properties: {},
        required: [],
        unexpectedField: 'test',
      }),
    ).toBe(false);
    expect(
      ajv.validate(metaSchema, {
        type: 'object',
        additionalProperties: false,
        properties: {},
        required: [],
      }),
    ).toBe(true);
  });

  it('nested object', () => {
    expect(
      ajv.validate(metaSchema, {
        type: 'object',
        additionalProperties: false,
        properties: {
          firstName: {
            type: 'string',
            default: 'firstName',
          },
          age: {
            type: 'number',
            default: 10,
          },
          company: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                default: 'name',
              },
              code: {
                type: 'number',
                default: 1,
              },
            },
            additionalProperties: false,
            required: ['name', 'code'],
          },
        },
        required: [],
      }),
    ).toBe(true);
  });

  it('invalid nested object', () => {
    expect(
      ajv.validate(metaSchema, {
        type: 'object',
        additionalProperties: false,
        properties: {
          firstName: {
            type: 'string',
            default: 'firstName',
          },
          age: {
            type: 'number',
            default: 10,
          },
          company: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                default: 'name',
              },
              code: {
                type: 'number',
                default: '', // <-- here
              },
            },
            additionalProperties: false,
            required: ['name', 'code'],
          },
        },
        required: [],
      }),
    ).toBe(false);
  });

  it('array', () => {
    expect(ajv.validate(metaSchema, { type: 'array' })).toBe(false);
    expect(
      ajv.validate(metaSchema, {
        type: 'array',
        items: { type: 'string', default: '' },
      }),
    ).toBe(true);
    expect(ajv.validate(metaSchema, { type: 'number' })).toBe(false);
    expect(
      ajv.validate(metaSchema, {
        type: 'array',
        items: { type: 'number', default: 0 },
      }),
    ).toBe(true);
    expect(ajv.validate(metaSchema, { type: 'boolean' })).toBe(false);
    expect(
      ajv.validate(metaSchema, {
        type: 'array',
        items: { type: 'boolean', default: false },
      }),
    ).toBe(true);

    expect(
      ajv.validate(metaSchema, {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            firstName: { type: 'string', default: '' },
          },
          required: ['firstName'],
        },
      }),
    ).toBe(true);

    expect(
      ajv.validate(metaSchema, {
        type: 'array',
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              firstName: { type: 'string', default: '' },
            },
            required: ['firstName'],
          },
        },
      }),
    ).toBe(true);
  });

  it('nested array', () => {
    expect(
      ajv.validate(metaSchema, {
        type: 'object',
        additionalProperties: false,
        properties: {
          items: { type: 'array', items: { type: 'string', default: '' } },
        },
        required: ['firstName'],
      }),
    ).toBe(true);

    expect(
      ajv.validate(metaSchema, {
        type: 'object',
        additionalProperties: false,
        properties: {
          items: { type: 'array' },
        },
        required: ['firstName'],
      }),
    ).toBe(false);
  });
});
