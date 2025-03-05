import {
  getArraySchema,
  getObjectSchema,
  getStringSchema,
} from 'src/__tests__/utils/schema/schema.mocks';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { getForeignKeysFromSchema } from 'src/features/share/utils/schema/lib/getForeignKeysFromSchema';

describe('getForeignKeyFromSchema', () => {
  it('string', () => {
    const schema = getStringSchema({
      foreignKey: 'tableId',
    });

    expect(
      getForeignKeysFromSchema(createJsonSchemaStore(schema)),
    ).toStrictEqual(['tableId']);
  });

  it('array / string', () => {
    const schema = getArraySchema(
      getStringSchema({
        foreignKey: 'tableId',
      }),
    );

    expect(
      getForeignKeysFromSchema(createJsonSchemaStore(schema)),
    ).toStrictEqual(['tableId']);
  });

  it('object string', () => {
    const schema = getObjectSchema({
      field1: getStringSchema({
        foreignKey: 'tableId1',
      }),
      field2: getStringSchema({
        foreignKey: 'tableId2',
      }),
    });

    expect(
      getForeignKeysFromSchema(createJsonSchemaStore(schema)),
    ).toStrictEqual(['tableId1', 'tableId2']);
  });

  it('complex schema', () => {
    const schema = getObjectSchema({
      field: getStringSchema({
        foreignKey: 'tableId2',
      }),
      ids: getArraySchema(
        getStringSchema({
          foreignKey: 'tableId4',
        }),
      ),
      nested: getObjectSchema({
        subField: getStringSchema(),
        subField2: getStringSchema({ foreignKey: 'tableId3' }),
        subField3: getArraySchema(getStringSchema({ foreignKey: 'tableId1' })),
      }),
    });

    expect(
      getForeignKeysFromSchema(createJsonSchemaStore(schema)),
    ).toStrictEqual(['tableId1', 'tableId2', 'tableId3', 'tableId4']);
  });

  it('avoiding duplicates', () => {
    const schema = getObjectSchema({
      field: getStringSchema({
        foreignKey: 'tableId1',
      }),
      ids: getArraySchema(
        getStringSchema({
          foreignKey: 'tableId1',
        }),
      ),
      nested: getObjectSchema({
        subField: getStringSchema({ foreignKey: 'tableId1' }),
        subField2: getStringSchema({ foreignKey: 'tableId2' }),
      }),
    });

    expect(
      getForeignKeysFromSchema(createJsonSchemaStore(schema)),
    ).toStrictEqual(['tableId1', 'tableId2']);
  });
});
