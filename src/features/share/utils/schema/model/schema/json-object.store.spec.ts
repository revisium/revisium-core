import { JsonNumberStore } from 'src/features/share/utils/schema/model/schema/json-number.store';
import { JsonObjectStore } from 'src/features/share/utils/schema/model/schema/json-object.store';
import { JsonStringStore } from 'src/features/share/utils/schema/model/schema/json-string.store';
import { JsonObjectValueStore } from 'src/features/share/utils/schema/model/value/json-object-value.store';

describe('JsonObjectStore', () => {
  it('add property event', () => {
    const store = new JsonObjectStore();
    const value = new JsonObjectValueStore(store, 'row-1', {});

    const field1 = new JsonStringStore();
    store.addPropertyWithStore('field1', field1);
    expect(value.getPlainValue()).toStrictEqual({ field1: field1.default });

    const field2 = new JsonStringStore();
    store.addPropertyWithStore('field2', field2);
    expect(value.getPlainValue()).toStrictEqual({
      field1: field1.default,
      field2: field2.default,
    });
  });

  it('removed property event', () => {
    const store = new JsonObjectStore();
    const value = new JsonObjectValueStore(store, 'row-1', {});

    const field1 = new JsonStringStore();
    const field2 = new JsonStringStore();
    store.addPropertyWithStore('field1', field1);
    store.addPropertyWithStore('field2', field2);

    store.removeProperty('field2');
    expect(value.getPlainValue()).toStrictEqual({
      field1: field1.default,
    });
  });

  it('migrate property event', () => {
    const store = new JsonObjectStore();
    const value = new JsonObjectValueStore(store, 'row-1', {});

    const fieldOld = new JsonStringStore();
    const fieldNew = new JsonNumberStore();
    store.addPropertyWithStore('field', fieldOld);

    store.migratePropertyWithStore('field', fieldNew);
    expect(value.getPlainValue()).toStrictEqual({ field: fieldNew.default });
  });

  it('change name event', () => {
    const store = new JsonObjectStore();
    const value = new JsonObjectValueStore(store, 'row-1', {});

    const field = new JsonStringStore();
    store.addPropertyWithStore('field', field);

    store.changeName('field', 'field2');
    expect(value.getPlainValue()).toStrictEqual({
      field2: field.default,
    });
  });

  it('default value', () => {
    const store = new JsonObjectStore();

    expect(store.default).toStrictEqual({});

    store.addPropertyWithStore('field', new JsonNumberStore());
    expect(store.default).toStrictEqual({ field: 0 });

    store.addPropertyWithStore('string', new JsonStringStore());
    expect(store.default).toStrictEqual({ field: 0, string: '' });

    store.addPropertyWithStore('obj', new JsonObjectStore());
    expect(store.default).toStrictEqual({ field: 0, string: '', obj: {} });

    store.removeProperty('string');
    expect(store.default).toStrictEqual({ field: 0, obj: {} });

    store.migratePropertyWithStore('obj', new JsonNumberStore());
    expect(store.default).toStrictEqual({ field: 0, obj: 0 });
  });

  it('registerValue', () => {
    const store = new JsonObjectStore();

    expect(store.getValue('row-1')).toBeUndefined();
    expect(store.getValue('row-2')).toBeUndefined();

    const value1_1 = new JsonObjectValueStore(store, 'row-1', {});
    expect(value1_1.index).toEqual(0);
    const value1_2 = new JsonObjectValueStore(store, 'row-1', {});
    expect(value1_2.index).toEqual(1);
    const value2 = new JsonObjectValueStore(store, 'row-2', {});
    expect(value2.index).toEqual(0);

    expect(store.getValue('row-1')).toEqual(value1_1);
    expect(store.getValue('row-1', 1)).toEqual(value1_2);
    expect(store.getValue('row-2', 0)).toEqual(value2);
  });

  it('should return $ref', () => {
    const store = new JsonObjectStore();
    store.$ref = 'ref.json';

    expect(store.getPlainSchema()).toStrictEqual({
      $ref: 'ref.json',
    });

    store.deprecated = true;
    store.title = 'title';
    store.description = 'description';
    expect(store.getPlainSchema()).toStrictEqual({
      $ref: 'ref.json',
      deprecated: true,
      description: 'description',
      title: 'title',
    });
  });

  it('title', () => {
    const store = new JsonObjectStore();
    store.title = 'title';

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'object',
      additionalProperties: false,
      properties: {},
      required: [],
      title: 'title',
    });
  });

  it('description', () => {
    const store = new JsonObjectStore();
    store.description = 'description';

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'object',
      additionalProperties: false,
      properties: {},
      required: [],
      description: 'description',
    });
  });

  it('deprecated', () => {
    const store = new JsonObjectStore();
    store.deprecated = true;

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'object',
      additionalProperties: false,
      properties: {},
      required: [],
      deprecated: true,
    });
  });
});
