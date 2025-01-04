import {
  getArraySchema,
  getObjectSchema,
  getStringSchema,
} from 'src/__tests__/utils/schema/schema.mocks';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
import { getReferencesFromValue } from 'src/features/share/utils/schema/lib/getReferencesFromValue';

describe('getReferenceFromValue', () => {
  it('string', () => {
    const schema = getStringSchema({
      reference: 'tableId',
    });

    const value = createJsonValueStore(
      createJsonSchemaStore(schema),
      '',
      'rowId',
    );

    expect(getReferencesFromValue(value)).toStrictEqual([
      { tableId: 'tableId', rowIds: ['rowId'] },
    ]);
  });

  it('array / string', () => {
    const schema = getArraySchema(
      getStringSchema({
        reference: 'table1',
      }),
    );

    const value = createJsonValueStore(createJsonSchemaStore(schema), '', [
      'row12',
      'row1',
      'row3',
    ]);

    expect(getReferencesFromValue(value)).toStrictEqual([
      { tableId: 'table1', rowIds: ['row1', 'row12', 'row3'] },
    ]);
  });

  it('object string', () => {
    const schema = getObjectSchema({
      field1: getStringSchema({
        reference: 'tableId1',
      }),
      field2: getStringSchema({
        reference: 'tableId2',
      }),
    });

    const value = createJsonValueStore(createJsonSchemaStore(schema), '', {
      field1: 'rowFromTable1',
      field2: 'rowFromTable2',
    });

    expect(getReferencesFromValue(value)).toStrictEqual([
      { tableId: 'tableId1', rowIds: ['rowFromTable1'] },
      { tableId: 'tableId2', rowIds: ['rowFromTable2'] },
    ]);
  });

  it('complex schema', () => {
    const schema = getObjectSchema({
      field: getStringSchema({
        reference: 'tableId2',
      }),
      ids: getArraySchema(
        getStringSchema({
          reference: 'tableId4',
        }),
      ),
      nested: getObjectSchema({
        subField: getStringSchema(),
        subField2: getStringSchema({ reference: 'tableId3' }),
        subField3: getArraySchema(
          getObjectSchema({
            subSub: getStringSchema({ reference: 'tableId1' }),
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

    expect(getReferencesFromValue(value)).toStrictEqual([
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
        reference: 'tableId1',
      }),
      ids: getArraySchema(
        getStringSchema({
          reference: 'tableId1',
        }),
      ),
      nested: getObjectSchema({
        subField: getStringSchema({ reference: 'tableId1' }),
        subField2: getStringSchema({ reference: 'tableId2' }),
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

    expect(getReferencesFromValue(value)).toStrictEqual([
      { tableId: 'tableId1', rowIds: ['rowTable1', 'rowTable1_1'] },
      {
        tableId: 'tableId2',
        rowIds: ['rowTable2'],
      },
    ]);
  });
});
