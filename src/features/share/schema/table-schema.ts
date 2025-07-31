import { Schema } from 'ajv/dist/2020';

export const tableSchema: Schema = {
  $id: 'table-schema.json',
  type: 'object',
  additionalProperties: false,
  required: ['createdId', 'initMigration', 'migrations'],
  properties: {
    createdId: { type: 'string' },
    initMigration: { $ref: '#/definitions/InitMigration' },
    migrations: {
      type: 'array',
      minItems: 0,
      items: { $ref: '#/definitions/Migration' },
    },
  },
  definitions: {
    InitMigration: {
      type: 'object',
      additionalProperties: false,
      required: ['changeType', 'tableId', 'hash', 'date', 'schema'],
      properties: {
        changeType: { type: 'string', const: 'init' },
        tableId: { type: 'string' },
        hash: { type: 'string' },
        date: { type: 'string' },
        schema: { $ref: 'meta-schema.json' },
      },
    },
    UpdateMigration: {
      type: 'object',
      additionalProperties: false,
      required: ['changeType', 'hash', 'date', 'patches'],
      properties: {
        changeType: { type: 'string', const: 'update' },
        hash: { type: 'string' },
        date: { type: 'string' },
        patches: {
          $ref: 'json-patch-schema.json',
        },
      },
    },
    RenameMigration: {
      type: 'object',
      additionalProperties: false,
      required: ['changeType', 'date', 'tableId'],
      properties: {
        changeType: { type: 'string', const: 'rename' },
        date: { type: 'string' },
        tableId: { type: 'string' },
      },
    },
    Migration: {
      oneOf: [
        { $ref: '#/definitions/UpdateMigration' },
        { $ref: '#/definitions/RenameMigration' },
      ],
    },
  },
  title: 'JSON Schema for Table with Migrations',
};
