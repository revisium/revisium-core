import Ajv from 'ajv/dist/2020';
import { jsonPatchSchema } from 'src/features/share/schema/json-patch-schema';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import { tableMigrationsSchema } from 'src/features/share/schema/table-migrations-schema';

describe('table-schema', () => {
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
    ajv.addSchema(metaSchema);
    ajv.addSchema(jsonPatchSchema);
  });

  it('no errors', () => {
    const result = ajv.validate(tableMigrationsSchema, {
      createdId: 'id',
      initMigration: {
        changeType: 'init',
        tableId: 'user',
        date: '2025-07-30T17:03:37.790Z',
        hash: '9fb329b07bc9244b7cb9d04525777ce482db99f8',
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
      },
      migrations: [
        {
          changeType: 'update',
          hash: '2d148fb2e66a2cc0ddb985c3403f334efa75146e',
          date: '2025-07-30T17:18:26.947Z',
          patches: [
            {
              op: 'move',
              from: '/properties/test',
              path: '/properties/test2',
            },
          ],
        },
        {
          changeType: 'rename',
          tableId: 'newName',
          date: '2025-07-30T18:18:26.947Z',
        },
      ],
    });

    expect(result).toBe(true);
  });
});
