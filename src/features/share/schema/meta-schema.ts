import { Schema } from 'ajv/dist/2020';
import { sharedFields } from 'src/features/share/schema/shared-fields';

// https://json-schema.org/specification#single-vocabulary-meta-schemas

export const refMetaSchema: Schema = {
  type: 'object',
  properties: {
    ...sharedFields,
    $ref: {
      type: 'string',
    },
  },
  additionalProperties: false,
  required: ['$ref'],
};

export const baseStringFields: Schema = {
  type: {
    const: 'string',
  },
  default: {
    type: 'string',
  },
  readOnly: {
    type: 'boolean',
  },
  pattern: {
    type: 'string',
    format: 'regex',
  },
  enum: {
    type: 'array',
    items: { type: 'string' },
    minItems: 1,
    uniqueItems: true,
  },
  format: {
    type: 'string',
    enum: ['date-time', 'date', 'time', 'email', 'regex'],
  },
  contentMediaType: {
    type: 'string',
    enum: [
      'text/plain',
      'text/markdown',
      'text/html',
      'application/json',
      'application/schema+json',
      'application/yaml',
    ],
  },
  ...sharedFields,
};

export const stringMetaSchema: Schema = {
  type: 'object',
  properties: {
    ...baseStringFields,
    foreignKey: {
      type: 'string',
    },
  },
  additionalProperties: false,
  required: ['type', 'default'],
};

export const noForeignKeyStringMetaSchema: Schema = {
  type: 'object',
  properties: {
    ...baseStringFields,
  },
  additionalProperties: false,
  required: ['type', 'default'],
};

export const numberMetaSchema: Schema = {
  type: 'object',
  properties: {
    type: {
      const: 'number',
    },
    default: {
      type: 'number',
    },
    readOnly: {
      type: 'boolean',
    },
    ...sharedFields,
  },
  additionalProperties: false,
  required: ['type', 'default'],
};

export const booleanMetaSchema: Schema = {
  type: 'object',
  properties: {
    type: {
      const: 'boolean',
    },
    default: {
      type: 'boolean',
    },
    readOnly: {
      type: 'boolean',
    },
    ...sharedFields,
  },
  additionalProperties: false,
  required: ['type', 'default'],
};

export const objectMetaSchema: Schema = {
  type: 'object',
  properties: {
    type: {
      const: 'object',
    },
    ...sharedFields,
    properties: {
      type: 'object',
      additionalProperties: { $dynamicRef: '#meta' },
      default: {},
    },
    additionalProperties: { const: false },
    required: { $ref: '#/$defs/stringArray' },
  },
  additionalProperties: false,
  required: ['type', 'properties', 'additionalProperties', 'required'],
};

export const arrayMetaSchema: Schema = {
  type: 'object',
  properties: {
    type: {
      const: 'array',
    },
    ...sharedFields,
    items: {
      oneOf: [
        { $ref: '#/$defs/refSchema' },
        { $ref: '#/$defs/objectSchema' },
        { $ref: '#/$defs/arraySchema' },
        { $ref: '#/$defs/stringSchema' },
        { $ref: '#/$defs/numberSchema' },
        { $ref: '#/$defs/booleanSchema' },
      ],
    },
  },
  additionalProperties: false,
  required: ['type', 'items'],
};

export const metaSchema: Schema = {
  $id: 'meta-schema.json',
  type: 'object',
  $dynamicAnchor: 'meta',
  oneOf: [
    { $ref: '#/$defs/refSchema' },
    { $ref: '#/$defs/objectSchema' },
    { $ref: '#/$defs/arraySchema' },
    { $ref: '#/$defs/stringSchema' },
    { $ref: '#/$defs/numberSchema' },
    { $ref: '#/$defs/booleanSchema' },
  ],
  $defs: {
    stringArray: {
      type: 'array',
      items: { type: 'string' },
      uniqueItems: true,
      default: [],
    },
    refSchema: refMetaSchema,
    objectSchema: objectMetaSchema,
    stringSchema: stringMetaSchema,
    numberSchema: numberMetaSchema,
    booleanSchema: booleanMetaSchema,
    arraySchema: arrayMetaSchema,
  },
};

export const notForeignKeyMetaSchema: Schema = {
  type: 'object',
  $dynamicAnchor: 'meta',
  oneOf: [
    { $ref: '#/$defs/refSchema' },
    { $ref: '#/$defs/objectSchema' },
    { $ref: '#/$defs/arraySchema' },
    { $ref: '#/$defs/stringSchema' },
    { $ref: '#/$defs/numberSchema' },
    { $ref: '#/$defs/booleanSchema' },
  ],
  $defs: {
    stringArray: {
      type: 'array',
      items: { type: 'string' },
      uniqueItems: true,
      default: [],
    },
    refSchema: refMetaSchema,
    objectSchema: objectMetaSchema,
    stringSchema: noForeignKeyStringMetaSchema,
    numberSchema: numberMetaSchema,
    booleanSchema: booleanMetaSchema,
    arraySchema: arrayMetaSchema,
  },
};
