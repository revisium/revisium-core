import Ajv from 'ajv/dist/2020';
import {
  metaSchema,
  notForeignKeyMetaSchema,
} from 'src/features/share/schema/meta-schema';

describe('meta-schema', () => {
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
        foreignKey: 'tableId',
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
        foreignKey: 1,
      }),
    ).toBe(false);
  });

  it('string no foreignKey', () => {
    expect(
      ajv.validate(notForeignKeyMetaSchema, {
        type: 'string',
        default: 'default value',
      }),
    ).toBe(true);

    expect(
      ajv.validate(notForeignKeyMetaSchema, {
        type: 'string',
        default: 'default value',
        foreignKey: 'tableId',
      }),
    ).toBe(false);

    expect(
      ajv.validate(notForeignKeyMetaSchema, { type: 'string', default: 0 }),
    ).toBe(false);

    expect(ajv.validate(notForeignKeyMetaSchema, { type: 'string' })).toBe(
      false,
    );

    expect(
      ajv.validate(notForeignKeyMetaSchema, {
        type: 'string',
        default: 'default value',
        unexpectedField: 'test',
      }),
    ).toBe(false);

    expect(
      ajv.validate(notForeignKeyMetaSchema, {
        type: 'string',
        default: 'default value',
        foreignKey: 1,
      }),
    ).toBe(false);

    checkBaseFields({
      type: 'string',
      default: '',
    });

    // regexp
    expect(
      ajv.validate(metaSchema, {
        type: 'string',
        default: 'abc',
        pattern: '^[a-z]+$',
      }),
    ).toBe(true);

    expect(
      ajv.validate(metaSchema, {
        type: 'string',
        default: 'abc',
        pattern: '[',
      }),
    ).toBe(false);

    // enum
    expect(
      ajv.validate(metaSchema, {
        type: 'string',
        default: 'a',
        enum: ['a', 'b', 'c'],
      }),
    ).toBe(true);

    expect(
      ajv.validate(metaSchema, {
        type: 'string',
        default: 'a',
        enum: ['a', 'a'],
      }),
    ).toBe(false);

    expect(
      ajv.validate(metaSchema, {
        type: 'string',
        default: 'a',
        enum: [1, 2],
      }),
    ).toBe(false);

    // format
    for (const validFormat of ['date-time', 'date', 'time', 'email', 'regex']) {
      expect(
        ajv.validate(metaSchema, {
          type: 'string',
          default: '',
          format: validFormat,
        }),
      ).toBe(true);
    }
    expect(
      ajv.validate(metaSchema, {
        type: 'string',
        default: 'value',
        format: 'nonexistent-format',
      }),
    ).toBe(false);

    // contentMediaType
    for (const mediaType of [
      'text/plain',
      'text/markdown',
      'text/html',
      'application/json',
      'application/schema+json',
      'application/yaml',
    ]) {
      expect(
        ajv.validate(metaSchema, {
          type: 'string',
          default: '',
          contentMediaType: mediaType,
        }),
      ).toBe(true);
    }

    expect(
      ajv.validate(metaSchema, {
        type: 'string',
        default: '',
        contentMediaType: 'image/png',
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

    checkBaseFields({
      type: 'number',
      default: 0,
    });
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

    checkBaseFields({
      type: 'boolean',
      default: true,
    });
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

    checkBaseFields(
      {
        type: 'object',
        additionalProperties: false,
        properties: {},
        required: [],
      },
      { skipReadOnly: true },
    );
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
            title: 'firstName',
          },
          age: {
            type: 'number',
            default: 10,
            description: 'age',
          },
          company: {
            type: 'object',
            title: 'company',
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

    checkBaseFields(
      {
        type: 'array',
        items: {
          type: 'array',
          items: {
            type: 'string',
            title: 'title',
            default: '',
          },
        },
      },
      { skipReadOnly: true },
    );
  });

  it('nested array', () => {
    expect(
      ajv.validate(metaSchema, {
        type: 'object',
        additionalProperties: false,
        properties: {
          items: { type: 'array', items: { type: 'string', default: '' } },
        },
        required: ['items'],
      }),
    ).toBe(true);

    expect(
      ajv.validate(metaSchema, {
        type: 'object',
        additionalProperties: false,
        properties: {
          items: { type: 'array' },
        },
        required: ['items'],
      }),
    ).toBe(false);
  });

  it('object', () => {
    expect(ajv.validate(metaSchema, { $ref: 'ref-schema.json' })).toBe(true);
    expect(ajv.validate(metaSchema, { $ref2: 'ref-schema.json' })).toBe(false);
    expect(
      ajv.validate(metaSchema, {
        $ref: 'ref-schema.json',
        additionalProperties: false,
      }),
    ).toBe(false);
    expect(
      ajv.validate(metaSchema, {
        type: 'object',
        additionalProperties: false,
        properties: {
          person: { $ref: 'ref-schema.json' },
        },
        required: ['person'],
      }),
    ).toBe(true);
    expect(
      ajv.validate(metaSchema, {
        type: 'object',
        additionalProperties: false,
        properties: {
          items: { type: 'array', items: { $ref: 'ref-schema.json' } },
        },
        required: ['items'],
      }),
    ).toBe(true);
    expect(
      ajv.validate(metaSchema, {
        type: 'object',
        additionalProperties: false,
        properties: {
          company: {
            type: 'object',
            properties: {
              code: {
                $ref: 'ref-schema.json',
              },
            },
            additionalProperties: false,
            required: ['code'],
          },
        },
        required: ['company'],
      }),
    ).toBe(true);
  });

  function checkBaseFields(
    data: Record<string, unknown>,
    options?: { skipReadOnly?: boolean },
  ) {
    if (!options?.skipReadOnly) {
      expect(
        ajv.validate(metaSchema, {
          ...data,
          readOnly: true,
        }),
      ).toBe(true);
      expect(
        ajv.validate(metaSchema, {
          ...data,
          readOnly: false,
        }),
      ).toBe(true);
      expect(
        ajv.validate(metaSchema, {
          ...data,
          readOnly: 0,
        }),
      ).toBe(false);
    }

    expect(
      ajv.validate(notForeignKeyMetaSchema, {
        ...data,
        title: 'title',
      }),
    ).toBe(true);
    expect(
      ajv.validate(notForeignKeyMetaSchema, {
        ...data,
        title: 0,
      }),
    ).toBe(false);

    expect(
      ajv.validate(notForeignKeyMetaSchema, {
        ...data,
        description: 'description',
      }),
    ).toBe(true);
    expect(
      ajv.validate(notForeignKeyMetaSchema, {
        ...data,
        description: 0,
      }),
    ).toBe(false);

    expect(
      ajv.validate(notForeignKeyMetaSchema, {
        ...data,
        deprecated: true,
      }),
    ).toBe(true);
    expect(
      ajv.validate(notForeignKeyMetaSchema, {
        ...data,
        deprecated: false,
      }),
    ).toBe(true);
    expect(
      ajv.validate(notForeignKeyMetaSchema, {
        ...data,
        description: 0,
      }),
    ).toBe(false);
  }
});
