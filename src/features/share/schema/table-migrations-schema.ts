import { Schema } from 'ajv/dist/2020';

export const tableMigrationsSchema: Schema = {
  $id: 'table-migrations-schema.json',
  oneOf: [
    { $ref: '#/definitions/InitMigration' },
    { $ref: '#/definitions/UpdateMigration' },
    { $ref: '#/definitions/RenameMigration' },
    { $ref: '#/definitions/RemoveMigration' },
  ],
  definitions: {
    InitMigration: {
      type: 'object',
      additionalProperties: false,
      required: ['changeType', 'tableId', 'hash', 'id', 'schema'],
      properties: {
        changeType: { type: 'string', const: 'init' },
        tableId: { type: 'string' },
        hash: { type: 'string' },
        id: { type: 'string' },
        schema: { $ref: 'meta-schema.json' },
      },
    },
    UpdateMigration: {
      type: 'object',
      additionalProperties: false,
      required: ['changeType', 'tableId', 'hash', 'id', 'patches'],
      properties: {
        changeType: { type: 'string', const: 'update' },
        tableId: { type: 'string' },
        hash: { type: 'string' },
        id: { type: 'string' },
        patches: { $ref: 'json-patch-schema.json' },
      },
    },
    RenameMigration: {
      type: 'object',
      additionalProperties: false,
      required: ['changeType', 'id', 'tableId', 'nextTableId'],
      properties: {
        changeType: { type: 'string', const: 'rename' },
        id: { type: 'string' },
        tableId: { type: 'string' },
        nextTableId: { type: 'string' },
      },
    },
    RemoveMigration: {
      type: 'object',
      additionalProperties: false,
      required: ['changeType', 'id', 'tableId'],
      properties: {
        changeType: { type: 'string', const: 'remove' },
        id: { type: 'string' },
        tableId: { type: 'string' },
      },
    },
  },
  title: 'JSON Schema for a Single Migration',
};
