import {
  getObjectSchema,
  getStringSchema,
} from 'src/__tests__/utils/schema/schema.mocks';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
import { JsonArrayStore } from 'src/features/share/utils/schema/model/schema/json-array.store';
import { JsonNumberStore } from 'src/features/share/utils/schema/model/schema/json-number.store';
import { JsonStringStore } from 'src/features/share/utils/schema/model/schema/json-string.store';
import { JsonArrayValueStore } from 'src/features/share/utils/schema/model/value/json-array-value.store';

describe('JsonArrayStore', () => {
  it('migrate items parent', () => {
    const fieldOld = new JsonStringStore();
    const fieldNew = new JsonNumberStore();
    const store = new JsonArrayStore(fieldOld);

    expect(fieldOld.parent).toEqual(store);
    expect(fieldNew.parent).toBeNull();

    store.migrateItems(fieldNew);

    expect(fieldOld.parent).toBeNull();
    expect(fieldNew.parent).toEqual(store);
  });

  it('migrate items event', () => {
    const fieldOld = new JsonStringStore();
    const fieldNew = new JsonNumberStore();
    const store = new JsonArrayStore(fieldOld);
    const value = createJsonValueStore(store, 'row-1', ['1', '2', '3']);

    store.migrateItems(fieldNew);

    expect(value.getPlainValue()).toStrictEqual([1, 2, 3]);
  });

  it('replace items event', () => {
    const fieldOld = new JsonStringStore();
    const fieldNew = new JsonNumberStore();
    createJsonValueStore(fieldNew, 'row-1', 123);
    createJsonValueStore(fieldNew, 'row-2', 321);
    const store = new JsonArrayStore(fieldOld);
    const value1 = createJsonValueStore(store, 'row-1', ['1', '2', '3']);
    const value2 = createJsonValueStore(store, 'row-2', ['4', '5', '6', '7']);
    const value3 = createJsonValueStore(store, 'row-3', ['10', '11']);

    store.replaceItems(fieldNew);

    expect(value1.getPlainValue()).toStrictEqual([123, 123, 123]);
    expect(value2.getPlainValue()).toStrictEqual([321, 321, 321, 321]);
    expect(value3.getPlainValue()).toStrictEqual([0, 0]);
  });

  it('replace items event with nested structure', () => {
    const fieldOld = new JsonStringStore();
    const fieldNew = createJsonSchemaStore(
      getObjectSchema({
        field: getStringSchema(),
      }),
    );
    createJsonValueStore(fieldNew, 'row-1', { field: 'field1' });
    createJsonValueStore(fieldNew, 'row-2', { field: 'field2' });
    const store = new JsonArrayStore(fieldOld);
    const value1 = createJsonValueStore(store, 'row-1', ['1', '2', '3']);
    const value2 = createJsonValueStore(store, 'row-2', ['4', '5', '6', '7']);
    const value3 = createJsonValueStore(store, 'row-3', ['10', '11']);

    store.replaceItems(fieldNew);

    expect(value1.getPlainValue()).toStrictEqual([
      { field: 'field1' },
      { field: 'field1' },
      { field: 'field1' },
    ]);
    expect(value2.getPlainValue()).toStrictEqual([
      { field: 'field2' },
      { field: 'field2' },
      { field: 'field2' },
      { field: 'field2' },
    ]);
    expect(value3.getPlainValue()).toStrictEqual([
      { field: '' },
      { field: '' },
    ]);
  });

  it('registerValue', () => {
    const store = new JsonArrayStore(new JsonStringStore());

    const value1_1 = new JsonArrayValueStore(store, 'row-1', []);
    expect(value1_1.index).toEqual(0);
    const value1_2 = new JsonArrayValueStore(store, 'row-1', []);
    expect(value1_2.index).toEqual(1);
    const value2 = new JsonArrayValueStore(store, 'row-2', []);
    expect(value2.index).toEqual(0);

    expect(store.getValue('row-1')).toEqual(value1_1);
    expect(store.getValue('row-1', 1)).toEqual(value1_2);
    expect(store.getValue('row-2', 0)).toEqual(value2);
  });

  it('should return $ref', () => {
    const store = new JsonArrayStore(new JsonStringStore());
    store.$ref = 'ref.json';

    expect(store.getPlainSchema()).toStrictEqual({
      $ref: 'ref.json',
    });
  });
});
