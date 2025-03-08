import {
  getArraySchema,
  getObjectSchema,
  getStringSchema,
} from 'src/__tests__/utils/schema/schema.mocks';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { getForeignKeyPatchesFromSchema } from 'src/features/share/utils/schema/lib/getForeignKeyPatchesFromSchema';

describe('getForeignKeyFromSchema', () => {
  it('string', () => {
    const schema = getStringSchema({
      foreignKey: 'tableId',
    });

    expect(
      getForeignKeyPatchesFromSchema(createJsonSchemaStore(schema), {
        tableId: 'tableId',
        nextTableId: 'nextTableId',
      }),
    ).toStrictEqual([
      {
        op: 'replace',
        path: '/',
        value: { default: '', foreignKey: 'nextTableId', type: 'string' },
      },
    ]);
  });

  it('array / string', () => {
    const schema = getArraySchema(
      getStringSchema({
        foreignKey: 'tableId',
      }),
    );

    expect(
      getForeignKeyPatchesFromSchema(createJsonSchemaStore(schema), {
        tableId: 'tableId',
        nextTableId: 'nextTableId',
      }),
    ).toStrictEqual([
      {
        op: 'replace',
        path: '/items',
        value: {
          default: '',
          foreignKey: 'nextTableId',
          type: 'string',
        },
      },
    ]);
  });

  it('object string', () => {
    const schema = getObjectSchema({
      field1: getStringSchema({
        foreignKey: 'tableId',
      }),
      field2: getStringSchema({
        foreignKey: 'tableId',
      }),
    });

    expect(
      getForeignKeyPatchesFromSchema(createJsonSchemaStore(schema), {
        tableId: 'tableId',
        nextTableId: 'nextTableId',
      }),
    ).toStrictEqual([
      {
        op: 'replace',
        path: '/properties/field1',
        value: {
          default: '',
          foreignKey: 'nextTableId',
          type: 'string',
        },
      },
      {
        op: 'replace',
        path: '/properties/field2',
        value: {
          default: '',
          foreignKey: 'nextTableId',
          type: 'string',
        },
      },
    ]);
  });

  it('complex schema', () => {
    const schema = getObjectSchema({
      field: getStringSchema({
        foreignKey: 'tableId',
      }),
      ids: getArraySchema(
        getStringSchema({
          foreignKey: 'tableId',
        }),
      ),
      nested: getObjectSchema({
        subField: getStringSchema(),
        subField2: getStringSchema({ foreignKey: 'tableId' }),
        subField3: getArraySchema(getStringSchema({ foreignKey: 'tableId' })),
      }),
    });

    expect(
      getForeignKeyPatchesFromSchema(createJsonSchemaStore(schema), {
        tableId: 'tableId',
        nextTableId: 'nextTableId',
      }),
    ).toStrictEqual([
      {
        op: 'replace',
        path: '/properties/field',
        value: {
          default: '',
          foreignKey: 'nextTableId',
          type: 'string',
        },
      },
      {
        op: 'replace',
        path: '/properties/ids/items',
        value: {
          default: '',
          foreignKey: 'nextTableId',
          type: 'string',
        },
      },
      {
        op: 'replace',
        path: '/properties/nested/properties/subField2',
        value: {
          default: '',
          foreignKey: 'nextTableId',
          type: 'string',
        },
      },
      {
        op: 'replace',
        path: '/properties/nested/properties/subField3/items',
        value: {
          default: '',
          foreignKey: 'nextTableId',
          type: 'string',
        },
      },
    ]);
  });

  it('object string and another table', () => {
    const schema = getObjectSchema({
      field1: getStringSchema({
        foreignKey: 'anotherTable',
      }),
      field2: getStringSchema({
        foreignKey: 'tableId',
      }),
    });

    expect(
      getForeignKeyPatchesFromSchema(createJsonSchemaStore(schema), {
        tableId: 'tableId',
        nextTableId: 'nextTableId',
      }),
    ).toStrictEqual([
      {
        op: 'replace',
        path: '/properties/field2',
        value: {
          default: '',
          foreignKey: 'nextTableId',
          type: 'string',
        },
      },
    ]);
  });
});
