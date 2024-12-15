import { getJsonSchemaStoreByPath } from 'src/share/utils/schema/lib/getJsonSchemaStoreByPath';
import { JsonArrayStore } from 'src/share/utils/schema/model/schema/json-array.store';
import { JsonObjectStore } from 'src/share/utils/schema/model/schema/json-object.store';
import { JsonStringStore } from 'src/share/utils/schema/model/schema/json-string.store';

describe('getStoreByPath', () => {
  it('root', () => {
    const store = new JsonObjectStore();

    expect(getJsonSchemaStoreByPath(store, '')).toEqual(store);
  });

  it('invalid root', () => {
    const store = new JsonObjectStore();

    expect(() => getJsonSchemaStoreByPath(store, '/')).toThrow('invalid root');
  });

  describe('primitives', () => {
    it('unexpected token for primitive in array', () => {
      const valueStore = new JsonStringStore();
      const store = new JsonArrayStore(valueStore);

      expect(() => getJsonSchemaStoreByPath(store, '/items/value')).toThrow(
        'Unexpected "value" in "/items"',
      );
    });

    it('nested unexpected token for primitive in array', () => {
      const store = new JsonObjectStore();
      const valueStore = new JsonStringStore();
      const subStore = new JsonArrayStore(valueStore);
      store.addPropertyWithStore('array', subStore);

      expect(() =>
        getJsonSchemaStoreByPath(store, '/properties/array/items/value'),
      ).toThrow('Unexpected "value" in "/properties/array/items"');
    });

    it('unexpected token for primitive', () => {
      const store = new JsonObjectStore();
      store.addPropertyWithStore('value', new JsonStringStore());

      expect(() =>
        getJsonSchemaStoreByPath(store, '/properties/value/nestedValue'),
      ).toThrow('Unexpected "nestedValue" in "/properties/value"');
    });

    it('nested unexpected token for primitive', () => {
      const store = new JsonObjectStore();
      const subStore = new JsonObjectStore();
      store.addPropertyWithStore('sub', subStore);

      const valueStore = new JsonStringStore();
      subStore.addPropertyWithStore('value', valueStore);

      expect(() =>
        getJsonSchemaStoreByPath(
          store,
          '/properties/sub/properties/value/nestedValue',
        ),
      ).toThrow(
        'Unexpected "nestedValue" in "/properties/sub/properties/value"',
      );
    });
  });

  describe('object', () => {
    it('expected properties for object', () => {
      const store = new JsonObjectStore();
      store.addPropertyWithStore('value', new JsonStringStore());

      expect(() => getJsonSchemaStoreByPath(store, '/value/')).toThrow(
        'Expected "/properties/*" instead of /value/*',
      );
    });

    it('expected property name after properties for object', () => {
      const store = new JsonObjectStore();
      store.addPropertyWithStore('value', new JsonStringStore());

      expect(() => getJsonSchemaStoreByPath(store, '/properties/')).toThrow(
        'Expected property name after "/properties"',
      );
    });

    it('not found property name for object', () => {
      const store = new JsonObjectStore();
      store.addPropertyWithStore('value', new JsonStringStore());

      expect(() =>
        getJsonSchemaStoreByPath(store, '/properties/value2'),
      ).toThrow('Not found "value2" in "/properties"');
    });

    it('return value store for object store', () => {
      const store = new JsonObjectStore();
      const valueStore = new JsonStringStore();
      store.addPropertyWithStore('value', valueStore);

      expect(getJsonSchemaStoreByPath(store, '/properties/value')).toEqual(
        valueStore,
      );
      expect(valueStore.parent).toEqual(store);
    });
  });

  describe('array', () => {
    it('expected items for array', () => {
      const valueStore = new JsonStringStore();
      const store = new JsonArrayStore(valueStore);

      expect(() => getJsonSchemaStoreByPath(store, '/value/')).toThrow(
        'Expected "/items/*" instead of /value/*',
      );
    });

    it('return value store for array store', () => {
      const valueStore = new JsonStringStore();
      const store = new JsonArrayStore(valueStore);

      expect(getJsonSchemaStoreByPath(store, '/items')).toEqual(valueStore);
      expect(valueStore.parent).toEqual(store);
    });
  });

  describe('nested object', () => {
    it('return value store for object store', () => {
      const store = new JsonObjectStore();
      const subStore = new JsonObjectStore();
      store.addPropertyWithStore('sub', subStore);

      const valueStore = new JsonStringStore();
      subStore.addPropertyWithStore('value', valueStore);

      expect(
        getJsonSchemaStoreByPath(store, '/properties/sub/properties/value'),
      ).toEqual(valueStore);
      expect(valueStore.parent).toEqual(subStore);
    });

    it('expected properties for object', () => {
      const store = new JsonObjectStore();
      const subStore = new JsonObjectStore();
      store.addPropertyWithStore('sub', subStore);

      expect(() =>
        getJsonSchemaStoreByPath(store, '/properties/sub/value/'),
      ).toThrow(
        'Expected "/properties/sub/properties/*" instead of /properties/sub/value/*',
      );
    });

    it('expected property name after properties for object', () => {
      const store = new JsonObjectStore();
      const subStore = new JsonObjectStore();
      store.addPropertyWithStore('sub', subStore);

      expect(() =>
        getJsonSchemaStoreByPath(store, '/properties/sub/properties/'),
      ).toThrow('Expected property name after "/properties/sub/properties"');
    });

    it('not found property name for object', () => {
      const store = new JsonObjectStore();
      const subStore = new JsonObjectStore();
      store.addPropertyWithStore('sub', subStore);

      expect(() =>
        getJsonSchemaStoreByPath(store, '/properties/sub/properties/value2'),
      ).toThrow('Not found "value2" in "/properties/sub/properties');
    });
  });

  describe('nested array', () => {
    it('expected items for array', () => {
      const store = new JsonObjectStore();
      const valueStore = new JsonStringStore();
      const subStore = new JsonArrayStore(valueStore);
      store.addPropertyWithStore('array', subStore);

      expect(() =>
        getJsonSchemaStoreByPath(store, '/properties/array/value'),
      ).toThrow(
        'Expected "/properties/array/items/*" instead of /properties/array/value/*',
      );
    });

    it('return value store for array store', () => {
      const store = new JsonObjectStore();
      const valueStore = new JsonStringStore();
      const subStore = new JsonArrayStore(valueStore);
      store.addPropertyWithStore('array', subStore);

      expect(
        getJsonSchemaStoreByPath(store, '/properties/array/items'),
      ).toEqual(valueStore);
      expect(valueStore.parent).toEqual(subStore);
    });
  });

  describe('items of arrays', () => {
    it('expected object for array', () => {
      const root = new JsonObjectStore();

      const valueStore = new JsonStringStore();
      const objectStore = new JsonObjectStore();
      objectStore.addPropertyWithStore('subField', valueStore);

      const subStore = new JsonArrayStore(objectStore);
      root.addPropertyWithStore('array', subStore);

      expect(
        getJsonSchemaStoreByPath(
          root,
          '/properties/array/items/properties/subField',
        ),
      ).toEqual(valueStore);
      expect(valueStore.parent).toEqual(objectStore);
    });

    it('expected array for array', () => {
      const root = new JsonObjectStore();

      const valueStore = new JsonStringStore();
      const objectStore = new JsonObjectStore();
      objectStore.addPropertyWithStore('subField', valueStore);

      const subArray = new JsonArrayStore(objectStore);
      const array = new JsonArrayStore(subArray);
      root.addPropertyWithStore('array', array);

      expect(
        getJsonSchemaStoreByPath(root, '/properties/array/items/items'),
      ).toEqual(objectStore);
      expect(objectStore.parent).toEqual(subArray);
    });

    it('expected array for root', () => {
      const valueStore = new JsonStringStore();
      const array = new JsonArrayStore(valueStore);

      expect(getJsonSchemaStoreByPath(array, '/items')).toEqual(valueStore);
      expect(valueStore.parent).toEqual(array);
    });

    it('expected array for array for root', () => {
      const valueStore = new JsonStringStore();
      const subArray = new JsonArrayStore(valueStore);
      const array = new JsonArrayStore(subArray);

      expect(getJsonSchemaStoreByPath(array, '/items/items')).toEqual(
        valueStore,
      );
      expect(subArray.parent).toEqual(array);
    });

    it('expected object of array / array', () => {
      const root = new JsonObjectStore();

      const valueStore = new JsonStringStore();
      const objectStore = new JsonObjectStore();
      objectStore.addPropertyWithStore('subField', valueStore);

      const subArray = new JsonArrayStore(objectStore);
      const array = new JsonArrayStore(subArray);
      root.addPropertyWithStore('array', array);

      expect(
        getJsonSchemaStoreByPath(
          root,
          '/properties/array/items/items/properties/subField',
        ),
      ).toEqual(valueStore);
      expect(valueStore.parent).toEqual(objectStore);
    });
  });
});
