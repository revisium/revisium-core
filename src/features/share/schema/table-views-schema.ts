import { Schema } from 'ajv/dist/2020';

export const tableViewsSchema: Schema = {
  $id: 'table-views-schema.json',
  type: 'object',
  additionalProperties: false,
  required: ['version', 'views'],
  properties: {
    version: {
      type: 'integer',
      minimum: 1,
      default: 1,
    },
    defaultViewId: {
      type: 'string',
      default: 'default',
    },
    views: {
      type: 'array',
      items: { $ref: '#/$defs/View' },
      default: [],
    },
  },
  $defs: {
    View: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'name'],
      properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        description: { type: 'string', maxLength: 500, default: '' },
        columns: {
          oneOf: [
            { type: 'null' },
            { type: 'array', items: { $ref: '#/$defs/Column' } },
          ],
          default: null,
        },
        filters: { $ref: '#/$defs/FilterGroup' },
        sorts: {
          type: 'array',
          items: { $ref: '#/$defs/Sort' },
          default: [],
        },
        search: {
          type: 'string',
          default: '',
        },
      },
    },
    Column: {
      type: 'object',
      additionalProperties: false,
      required: ['field'],
      properties: {
        field: { type: 'string', minLength: 1 },
        width: { type: 'number', minimum: 40 },
      },
    },
    FilterGroup: {
      type: 'object',
      additionalProperties: false,
      properties: {
        logic: {
          type: 'string',
          enum: ['and', 'or'],
          default: 'and',
        },
        conditions: {
          type: 'array',
          items: { $ref: '#/$defs/FilterCondition' },
          default: [],
        },
        groups: {
          type: 'array',
          items: { $ref: '#/$defs/FilterGroup' },
          default: [],
        },
      },
    },
    FilterCondition: {
      type: 'object',
      additionalProperties: false,
      required: ['field', 'operator'],
      properties: {
        field: { type: 'string', minLength: 1 },
        operator: {
          type: 'string',
          enum: [
            'equals',
            'not_equals',
            'contains',
            'not_contains',
            'starts_with',
            'ends_with',
            'is_empty',
            'is_not_empty',
            'greater_than',
            'greater_than_or_equal',
            'less_than',
            'less_than_or_equal',
            'is_true',
            'is_false',
            'before',
            'after',
            'on_or_before',
            'on_or_after',
          ],
        },
        value: {},
      },
    },
    Sort: {
      type: 'object',
      additionalProperties: false,
      required: ['field', 'direction'],
      properties: {
        field: { type: 'string', minLength: 1 },
        direction: {
          type: 'string',
          enum: ['asc', 'desc'],
        },
      },
    },
  },
};
