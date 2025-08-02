import Ajv from 'ajv/dist/2020';
import { jsonPatchSchema } from 'src/features/share/schema/json-patch-schema';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import { tableMigrationsSchema } from 'src/features/share/schema/table-migrations-schema';

describe('table-migrations-schema', () => {
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
    ajv.addSchema(metaSchema, 'meta-schema.json');
    ajv.addSchema(jsonPatchSchema, 'json-patch-schema.json');
  });

  it('validates an init migration', () => {
    const validInit = {
      changeType: 'init',
      tableId: 'user',
      hash: '9fb329b07bc9244b7cb9d04525777ce482db99f8',
      id: 'init1',
      schema: {
        type: 'object',
        required: ['test'],
        properties: {
          test: {
            type: 'string',
            default: '',
          },
        },
        additionalProperties: false,
      },
    };

    const valid = ajv.validate(tableMigrationsSchema, validInit);
    expect(ajv.errors).toBeNull();
    expect(valid).toBe(true);
  });

  it('validates an update migration', () => {
    const validUpdate = {
      changeType: 'update',
      tableId: 'user',
      hash: '2d148fb2e66a2cc0ddb985c3403f334efa75146e',
      id: 'upd1',
      patches: [
        {
          op: 'move',
          from: '/properties/test',
          path: '/properties/test2',
        },
      ],
    };

    const valid = ajv.validate(tableMigrationsSchema, validUpdate);
    expect(valid).toBe(true);
    expect(ajv.errors).toBeNull();
  });

  it('validates a rename migration', () => {
    const validRename = {
      changeType: 'rename',
      id: 'ren1',
      tableId: 'newName',
      nextTableId: 'nextTableId',
    };

    const valid = ajv.validate(tableMigrationsSchema, validRename);
    expect(valid).toBe(true);
    expect(ajv.errors).toBeNull();
  });

  it('rejects invalid migration missing required fields', () => {
    const invalid = { changeType: 'update', hash: 'invalid' };
    const valid = ajv.validate(tableMigrationsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects migration with unknown changeType', () => {
    const invalidType = { changeType: 'delete', id: 'd1', tableId: 'user' };
    const valid = ajv.validate(tableMigrationsSchema, invalidType);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });
});
