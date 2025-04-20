import { Schema } from 'ajv/dist/2020';

// https://json-schema.org/specification#single-vocabulary-meta-schemas

export const refMetaSchema: Schema = {
  type: 'object',
  properties: {
    $ref: {
      type: 'string',
    },
  },
  additionalProperties: false,
  required: ['$ref'],
};

export const stringMetaSchema: Schema = {
  type: 'object',
  properties: {
    type: {
      const: 'string',
    },
    default: {
      type: 'string',
    },
    foreignKey: {
      type: 'string',
    },
    readOnly: {
      type: 'boolean',
    },
  },
  additionalProperties: false,
  required: ['type', 'default'],
};

export const noForeignKeyStringMetaSchema: Schema = {
  type: 'object',
  properties: {
    type: {
      const: 'string',
    },
    default: {
      type: 'string',
    },
    readOnly: {
      type: 'boolean',
    },
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
