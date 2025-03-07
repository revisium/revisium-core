import {
  getArraySchema,
  getObjectSchema,
  getStringSchema,
} from 'src/__tests__/utils/schema/schema.mocks';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
import { getForeignKeysFromValue } from 'src/features/share/utils/schema/lib/getForeignKeysFromValue';

describe('getForeignKeyFromValue', () => {
  it('string', () => {
    const schema = getStringSchema({
      foreignKey: 'tableId',
    });

    const value = createJsonValueStore(
      createJsonSchemaStore(schema),
      '',
      'rowId',
    );

    expect(getForeignKeysFromValue(value)).toStrictEqual([
      { tableId: 'tableId', rowIds: ['rowId'] },
    ]);
  });

  it('array / string', () => {
    const schema = getArraySchema(
      getStringSchema({
        foreignKey: 'table1',
      }),
    );

    const value = createJsonValueStore(createJsonSchemaStore(schema), '', [
      'row12',
      'row1',
      'row3',
    ]);

    expect(getForeignKeysFromValue(value)).toStrictEqual([
      { tableId: 'table1', rowIds: ['row1', 'row12', 'row3'] },
    ]);
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

    const value = createJsonValueStore(createJsonSchemaStore(schema), '', {
      field1: 'rowFromTable1',
      field2: 'rowFromTable2',
    });

    expect(getForeignKeysFromValue(value)).toStrictEqual([
      { tableId: 'tableId1', rowIds: ['rowFromTable1'] },
      { tableId: 'tableId2', rowIds: ['rowFromTable2'] },
    ]);
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
        subField3: getArraySchema(
          getObjectSchema({
            subSub: getStringSchema({ foreignKey: 'tableId1' }),
          }),
        ),
      }),
    });

    const value = createJsonValueStore(createJsonSchemaStore(schema), '', {
      field: 'rowFromTable2',
      ids: ['rowFromTable4_1', 'rowFromTable4_4', 'rowFromTable4_2'],
      nested: {
        subField: 'field',
        subField2: 'rowFromTable3',
        subField3: [
          {
            subSub: 'rowFromTable1_7',
          },
          {
            subSub: 'rowFromTable1_9',
          },
          {
            subSub: 'rowFromTable1_2',
          },
        ],
      },
    });

    expect(getForeignKeysFromValue(value)).toStrictEqual([
      { tableId: 'tableId2', rowIds: ['rowFromTable2'] },
      {
        tableId: 'tableId4',
        rowIds: ['rowFromTable4_1', 'rowFromTable4_2', 'rowFromTable4_4'],
      },
      { tableId: 'tableId3', rowIds: ['rowFromTable3'] },
      {
        tableId: 'tableId1',
        rowIds: ['rowFromTable1_2', 'rowFromTable1_7', 'rowFromTable1_9'],
      },
    ]);
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

    const value = createJsonValueStore(createJsonSchemaStore(schema), '', {
      field: 'rowTable1',
      ids: ['rowTable1', 'rowTable1', 'rowTable1_1'],
      nested: {
        subField: 'rowTable1',
        subField2: 'rowTable2',
      },
    });

    expect(getForeignKeysFromValue(value)).toStrictEqual([
      { tableId: 'tableId1', rowIds: ['rowTable1', 'rowTable1_1'] },
      {
        tableId: 'tableId2',
        rowIds: ['rowTable2'],
      },
    ]);
  });
});
