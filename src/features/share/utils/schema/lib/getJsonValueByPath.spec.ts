import {
  getArraySchema,
  getNumberSchema,
  getObjectSchema,
  getStringSchema,
} from 'src/__tests__/utils/schema/schema.mocks';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
import { getJsonValueStoreByPath } from 'src/features/share/utils/schema/lib/getJsonValueByPath';

describe('getJsonValueByPath', () => {
  it('complex', () => {
    const store = createJsonValueStore(
      createJsonSchemaStore(
        getObjectSchema({
          field: getStringSchema(),
          object: getObjectSchema({
            value: getStringSchema(),
          }),
          list: getArraySchema(
            getObjectSchema({
              nestedField: getStringSchema(),
              subList: getArraySchema(getNumberSchema()),
            }),
          ),
        }),
      ),
      '',
      {
        field: 'fieldValue',
        object: {
          value: 'objectNestedValue',
        },
        list: [
          { nestedField: 'value1', subList: [1, 2, 3, 4] },
          { nestedField: 'value2', subList: [] },
        ],
      },
    );

    expect(getJsonValueStoreByPath(store, '')).toStrictEqual(store);
    expect(
      getJsonValueStoreByPath(store, 'field').getPlainValue(),
    ).toStrictEqual('fieldValue');
    expect(
      getJsonValueStoreByPath(store, 'object').getPlainValue(),
    ).toStrictEqual({
      value: 'objectNestedValue',
    });
    expect(
      getJsonValueStoreByPath(store, 'object.value').getPlainValue(),
    ).toStrictEqual('objectNestedValue');
    expect(
      getJsonValueStoreByPath(store, 'list[0].nestedField').getPlainValue(),
    ).toStrictEqual('value1');
    expect(
      getJsonValueStoreByPath(store, 'list[1].nestedField').getPlainValue(),
    ).toStrictEqual('value2');
    expect(
      getJsonValueStoreByPath(store, 'list[0].subList').getPlainValue(),
    ).toStrictEqual([1, 2, 3, 4]);
    expect(
      getJsonValueStoreByPath(store, 'list[0].subList[1]').getPlainValue(),
    ).toStrictEqual(2);
    expect(
      getJsonValueStoreByPath(store, 'list[1].subList').getPlainValue(),
    ).toStrictEqual([]);

    expect(() =>
      getJsonValueStoreByPath(store, 'list[invalid].subList').getPlainValue(),
    ).toThrow(/Invalid array index "invalid"/);

    expect(() =>
      getJsonValueStoreByPath(
        store,
        'list[0].subList[0].invalid',
      ).getPlainValue(),
    ).toThrow(/Cannot navigate into primitive at segment "invalid"/);

    expect(() =>
      getJsonValueStoreByPath(store, 'list2').getPlainValue(),
    ).toThrow(/Path not found at segment "list2"/);

    expect(() =>
      getJsonValueStoreByPath(store, 'list[1].invalid').getPlainValue(),
    ).toThrow(/Path not found at segment "invalid"/);
  });
});
