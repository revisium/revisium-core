import { Schema } from 'ajv/dist/2020';
import { SystemSchemas } from 'src/features/share/schema/consts';

// https://json-schema.org/specification#single-vocabulary-meta-schemas

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
  $id: SystemSchemas.MetaSchema,
  type: 'object',
  $dynamicAnchor: 'meta',
  oneOf: [
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
    objectSchema: objectMetaSchema,
    stringSchema: noForeignKeyStringMetaSchema,
    numberSchema: numberMetaSchema,
    booleanSchema: booleanMetaSchema,
    arraySchema: arrayMetaSchema,
  },
};
