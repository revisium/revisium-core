import {
  getArraySchema,
  getObjectSchema,
  getStringSchema,
} from 'src/__tests__/utils/schema/schema.mocks';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { getJsonSchemaStoreByPath } from 'src/features/share/utils/schema/lib/getJsonSchemaStoreByPath';
import { getValuePathByStore } from 'src/features/share/utils/schema/lib/getValuePathByStore';
import { JsonArrayStore } from 'src/features/share/utils/schema/model/schema/json-array.store';
import { JsonBooleanStore } from 'src/features/share/utils/schema/model/schema/json-boolean.store';
import { JsonNumberStore } from 'src/features/share/utils/schema/model/schema/json-number.store';
import { JsonObjectStore } from 'src/features/share/utils/schema/model/schema/json-object.store';
import { JsonStringStore } from 'src/features/share/utils/schema/model/schema/json-string.store';

describe('getValuePathByStore', () => {
  it('no parent', () => {
    const object = new JsonObjectStore();
    expect(getValuePathByStore(object)).toEqual('$');

    const array = new JsonArrayStore(object);
    expect(getValuePathByStore(array)).toEqual('$');

    const string = new JsonStringStore();
    expect(getValuePathByStore(string)).toEqual('$');

    const number = new JsonNumberStore();
    expect(getValuePathByStore(number)).toEqual('$');

    const boolean = new JsonBooleanStore();
    expect(getValuePathByStore(boolean)).toEqual('$');
  });

  it('object property', () => {
    const object = new JsonObjectStore();
    expect(getValuePathByStore(object)).toEqual('$');

    const string = new JsonStringStore();
    object.addPropertyWithStore('stringField', string);
    expect(getValuePathByStore(string)).toEqual('$.stringField');

    const number = new JsonNumberStore();
    object.addPropertyWithStore('numberField', number);
    expect(getValuePathByStore(number)).toEqual('$.numberField');

    const boolean = new JsonBooleanStore();
    object.addPropertyWithStore('booleanField', boolean);
    expect(getValuePathByStore(boolean)).toEqual('$.booleanField');
  });

  it('items of array', () => {
    const object = new JsonObjectStore();
    const array = new JsonArrayStore(object);
    expect(getValuePathByStore(object)).toEqual('$[*]');

    const string = new JsonStringStore();
    array.migrateItems(string);
    expect(getValuePathByStore(string)).toEqual('$[*]');

    const number = new JsonNumberStore();
    array.migrateItems(number);
    expect(getValuePathByStore(number)).toEqual('$[*]');

    const boolean = new JsonBooleanStore();
    array.migrateItems(boolean);
    expect(getValuePathByStore(boolean)).toEqual('$[*]');
  });

  it('complex', () => {
    const store = createJsonSchemaStore(
      getObjectSchema({
        field: getObjectSchema({
          arr: getArraySchema(
            getArraySchema(
              getObjectSchema({
                subField: getArraySchema(
                  getObjectSchema({
                    subSubField: getStringSchema(),
                  }),
                ),
              }),
            ),
          ),
        }),
      }),
    );

    expect(
      getValuePathByStore(
        getJsonSchemaStoreByPath(
          store,
          '/properties/field/properties/arr/items/items/properties/subField/items/properties/subSubField',
        ),
      ),
    ).toEqual('$.field.arr[*][*].subField[*].subSubField');

    expect(
      getValuePathByStore(
        getJsonSchemaStoreByPath(
          store,
          '/properties/field/properties/arr/items/items/properties/subField/items',
        ),
      ),
    ).toEqual('$.field.arr[*][*].subField[*]');

    expect(
      getValuePathByStore(
        getJsonSchemaStoreByPath(
          store,
          '/properties/field/properties/arr/items/items/properties/subField',
        ),
      ),
    ).toEqual('$.field.arr[*][*].subField');

    expect(
      getValuePathByStore(
        getJsonSchemaStoreByPath(
          store,
          '/properties/field/properties/arr/items/items',
        ),
      ),
    ).toEqual('$.field.arr[*][*]');

    expect(
      getValuePathByStore(
        getJsonSchemaStoreByPath(
          store,
          '/properties/field/properties/arr/items',
        ),
      ),
    ).toEqual('$.field.arr[*]');

    expect(
      getValuePathByStore(
        getJsonSchemaStoreByPath(store, '/properties/field/properties/arr'),
      ),
    ).toEqual('$.field.arr');

    expect(
      getValuePathByStore(getJsonSchemaStoreByPath(store, '/properties/field')),
    ).toEqual('$.field');
  });

  it('complex array in root', () => {
    const store = createJsonSchemaStore(
      getArraySchema(
        getArraySchema(
          getObjectSchema({
            subField: getArraySchema(
              getObjectSchema({
                subSubField: getStringSchema(),
              }),
            ),
          }),
        ),
      ),
    );

    expect(
      getValuePathByStore(
        getJsonSchemaStoreByPath(
          store,
          '/items/items/properties/subField/items/properties/subSubField',
        ),
      ),
    ).toEqual('$[*][*].subField[*].subSubField');

    expect(
      getValuePathByStore(getJsonSchemaStoreByPath(store, '/items/items')),
    ).toEqual('$[*][*]');

    expect(
      getValuePathByStore(getJsonSchemaStoreByPath(store, '/items')),
    ).toEqual('$[*]');
  });
});
