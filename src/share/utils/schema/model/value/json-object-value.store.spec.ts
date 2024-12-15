import {
  getBooleanSchema,
  getNumberSchema,
  getObjectSchema,
  getStringSchema,
} from 'src/__tests__/utils/schema/schema.mocks';
import { createJsonSchemaStore } from 'src/share/utils/schema/lib/createJsonSchemaStore';
import { createJsonValueStore } from 'src/share/utils/schema/lib/createJsonValueStore';
import { JsonObjectStore } from 'src/share/utils/schema/model/schema/json-object.store';
import { JsonStringStore } from 'src/share/utils/schema/model/schema/json-string.store';

describe('JsonObjectValueStore', () => {
  it('subscribe to ADDED_PROPERTY', () => {
    const schema = createJsonSchemaStore(
      getObjectSchema({
        field: getNumberSchema(),
      }),
    ) as JsonObjectStore;
    const value1 = createJsonValueStore(schema, '', { field: 1 });
    const value2 = createJsonValueStore(schema, '', { field: 2 });

    const newField = new JsonStringStore();
    newField.default = 'default value';
    schema.addPropertyWithStore('newField', newField);

    expect(value1.getPlainValue()).toStrictEqual({
      field: 1,
      newField: newField.default,
    });
    expect(value2.getPlainValue()).toStrictEqual({
      field: 2,
      newField: newField.default,
    });
  });

  it('subscribe to ADDED_PROPERTY getValue from property', () => {
    const schema = createJsonSchemaStore(
      getObjectSchema({
        field: getNumberSchema(),
      }),
    ) as JsonObjectStore;
    const value1 = createJsonValueStore(schema, 'row-1', { field: 1 });
    const value2 = createJsonValueStore(schema, 'row-2', { field: 2 });
    const value3 = createJsonValueStore(schema, 'row-3', { field: 3 });

    const newField = new JsonStringStore();
    newField.default = 'default value';
    const nextValue1 = createJsonValueStore(newField, 'row-1', 'nextValue1');
    const nextValue2 = createJsonValueStore(newField, 'row-2', 'nextValue2');
    schema.addPropertyWithStore('newField', newField);

    expect(value1.getPlainValue()).toStrictEqual({
      field: 1,
      newField: nextValue1.value,
    });
    expect(value2.getPlainValue()).toStrictEqual({
      field: 2,
      newField: nextValue2.value,
    });
    expect(value3.getPlainValue()).toStrictEqual({
      field: 3,
      newField: newField.default,
    });
  });

  it('subscribe to REMOVED_PROPERTY', () => {
    const schema = createJsonSchemaStore(
      getObjectSchema({
        field: getNumberSchema(),
        fieldStr: getStringSchema(),
      }),
    ) as JsonObjectStore;
    const value1 = createJsonValueStore(schema, '', {
      field: 1,
      fieldStr: 'field1',
    });
    const value2 = createJsonValueStore(schema, '', {
      field: 2,
      fieldStr: 'field2',
    });

    schema.removeProperty('fieldStr');

    expect(value1.getPlainValue()).toStrictEqual({
      field: 1,
    });
    expect(value2.getPlainValue()).toStrictEqual({
      field: 2,
    });
  });

  it('subscribe to MIGRATE_PROPERTY', () => {
    const schema = createJsonSchemaStore(
      getObjectSchema({
        field: getNumberSchema(),
        fieldStr: getStringSchema(),
      }),
    ) as JsonObjectStore;
    const value1 = createJsonValueStore(schema, '', {
      field: 1,
      fieldStr: 'field1',
    });
    const value2 = createJsonValueStore(schema, '', {
      field: 2,
      fieldStr: 'field2',
    });

    const subSchema = createJsonSchemaStore(
      getObjectSchema({
        subField: getBooleanSchema(),
      }),
    );

    schema.migratePropertyWithStore('field', subSchema);

    expect(value1.getPlainValue()).toStrictEqual({
      field: {
        subField: false,
      },
      fieldStr: 'field1',
    });
    expect(value2.getPlainValue()).toStrictEqual({
      field: {
        subField: false,
      },
      fieldStr: 'field2',
    });
  });

  it('subscribe to CHANGE_NAME', () => {
    const schema = createJsonSchemaStore(
      getObjectSchema({
        field: getNumberSchema(),
        fieldStr: getStringSchema(),
      }),
    ) as JsonObjectStore;
    const value1 = createJsonValueStore(schema, '', {
      field: 1,
      fieldStr: 'field1',
    });
    const value2 = createJsonValueStore(schema, '', {
      field: 2,
      fieldStr: 'field2',
    });

    schema.changeName('fieldStr', 'fieldStrNew');

    expect(value1.getPlainValue()).toStrictEqual({
      field: 1,
      fieldStrNew: 'field1',
    });
    expect(value2.getPlainValue()).toStrictEqual({
      field: 2,
      fieldStrNew: 'field2',
    });
  });

  describe('replace transformations', () => {
    it('from number to string', () => {
      const schema = createJsonSchemaStore(
        getObjectSchema({
          field: getNumberSchema(),
        }),
      ) as JsonObjectStore;
      const value = createJsonValueStore(schema, '', {
        field: 101.5,
      });

      schema.migratePropertyWithStore(
        'field',
        createJsonSchemaStore(getStringSchema()),
      );

      expect(value.getPlainValue()).toStrictEqual({
        field: '101.5',
      });
    });

    it('from string to number', () => {
      const schema = createJsonSchemaStore(
        getObjectSchema({
          field1: getStringSchema(),
          field2: getStringSchema(),
        }),
      ) as JsonObjectStore;
      const value = createJsonValueStore(schema, '', {
        field1: '101.5',
        field2: '1value',
      });

      schema.migratePropertyWithStore(
        'field1',
        createJsonSchemaStore(getNumberSchema()),
      );
      schema.migratePropertyWithStore(
        'field2',
        createJsonSchemaStore(getNumberSchema()),
      );

      expect(value.getPlainValue()).toStrictEqual({
        field1: 101.5,
        field2: 1,
      });
    });

    it('from boolean to string', () => {
      const schema = createJsonSchemaStore(
        getObjectSchema({
          field1: getBooleanSchema(),
          field2: getBooleanSchema(),
        }),
      ) as JsonObjectStore;
      const value = createJsonValueStore(schema, '', {
        field1: true,
        field2: false,
      });

      schema.migratePropertyWithStore(
        'field1',
        createJsonSchemaStore(getStringSchema()),
      );
      schema.migratePropertyWithStore(
        'field2',
        createJsonSchemaStore(getStringSchema()),
      );

      expect(value.getPlainValue()).toStrictEqual({
        field1: 'true',
        field2: 'false',
      });
    });

    it('from string to boolean', () => {
      const schema = createJsonSchemaStore(
        getObjectSchema({
          field1: getStringSchema(),
          field2: getStringSchema(),
        }),
      ) as JsonObjectStore;
      const value = createJsonValueStore(schema, '', {
        field1: '13d',
        field2: 'faLse',
      });

      schema.migratePropertyWithStore(
        'field1',
        createJsonSchemaStore(getBooleanSchema()),
      );
      schema.migratePropertyWithStore(
        'field2',
        createJsonSchemaStore(getBooleanSchema()),
      );

      expect(value.getPlainValue()).toStrictEqual({
        field1: true,
        field2: false,
      });
    });

    it('from boolean to number', () => {
      const schema = createJsonSchemaStore(
        getObjectSchema({
          field1: getBooleanSchema(),
          field2: getBooleanSchema(),
        }),
      ) as JsonObjectStore;
      const value = createJsonValueStore(schema, '', {
        field1: false,
        field2: true,
      });

      schema.migratePropertyWithStore(
        'field1',
        createJsonSchemaStore(getNumberSchema()),
      );
      schema.migratePropertyWithStore(
        'field2',
        createJsonSchemaStore(getNumberSchema()),
      );

      expect(value.getPlainValue()).toStrictEqual({
        field1: 0,
        field2: 1,
      });
    });

    it('from number to boolean', () => {
      const schema = createJsonSchemaStore(
        getObjectSchema({
          field1: getNumberSchema(),
          field2: getNumberSchema(),
        }),
      ) as JsonObjectStore;
      const value = createJsonValueStore(schema, '', {
        field1: 1,
        field2: 0,
      });

      schema.migratePropertyWithStore(
        'field1',
        createJsonSchemaStore(getBooleanSchema()),
      );
      schema.migratePropertyWithStore(
        'field2',
        createJsonSchemaStore(getBooleanSchema()),
      );

      expect(value.getPlainValue()).toStrictEqual({
        field1: true,
        field2: false,
      });
    });
  });
});
