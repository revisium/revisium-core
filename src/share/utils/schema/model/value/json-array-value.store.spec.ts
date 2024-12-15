import {
  getArraySchema,
  getBooleanSchema,
  getNumberSchema,
  getObjectSchema,
  getStringSchema,
} from 'src/__tests__/utils/schema/schema.mocks';
import { createJsonSchemaStore } from 'src/share/utils/schema/lib/createJsonSchemaStore';
import { createJsonValueStore } from 'src/share/utils/schema/lib/createJsonValueStore';
import { JsonArrayStore } from 'src/share/utils/schema/model/schema/json-array.store';

describe('JsonArrayValueStore', () => {
  it('migrate items', () => {
    const schema = createJsonSchemaStore(
      getArraySchema(getArraySchema(getStringSchema())),
    ) as JsonArrayStore;
    const value1 = createJsonValueStore(schema, '', [
      ['1', '2'],
      ['3', '4', '5'],
    ]);
    const value2 = createJsonValueStore(schema, '', [
      ['7', '8', '9'],
      ['10'],
      ['11', '12'],
    ]);

    const subSchema = createJsonSchemaStore(
      getObjectSchema({
        field: getObjectSchema({
          subField: getBooleanSchema(),
        }),
      }),
    );

    (schema.items as JsonArrayStore).migrateItems(subSchema);

    expect(value1.getPlainValue()).toStrictEqual([
      [
        {
          field: {
            subField: false,
          },
        },
        {
          field: {
            subField: false,
          },
        },
      ],
      [
        {
          field: {
            subField: false,
          },
        },
        {
          field: {
            subField: false,
          },
        },
        {
          field: {
            subField: false,
          },
        },
      ],
    ]);
    expect(value2.getPlainValue()).toStrictEqual([
      [
        {
          field: {
            subField: false,
          },
        },
        {
          field: {
            subField: false,
          },
        },
        {
          field: {
            subField: false,
          },
        },
      ],
      [
        {
          field: {
            subField: false,
          },
        },
      ],
      [
        {
          field: {
            subField: false,
          },
        },
        {
          field: {
            subField: false,
          },
        },
      ],
    ]);
  });

  describe('migrate transformations', () => {
    it('from number to string', () => {
      const schema = createJsonSchemaStore(
        getArraySchema(getArraySchema(getNumberSchema())),
      ) as JsonArrayStore;
      const value = createJsonValueStore(schema, '', [
        [1.1, 2],
        [3.67, 0.4, 129],
      ]);

      const subSchema = createJsonSchemaStore(getStringSchema());

      (schema.items as JsonArrayStore).migrateItems(subSchema);

      expect(value.getPlainValue()).toStrictEqual([
        ['1.1', '2'],
        ['3.67', '0.4', '129'],
      ]);
    });

    it('from string to number', () => {
      const schema = createJsonSchemaStore(
        getArraySchema(getArraySchema(getStringSchema())),
      ) as JsonArrayStore;
      const value = createJsonValueStore(schema, '', [
        ['1.1', '2', 'value'],
        ['3.67', '0.4', '129'],
        ['test123', '', '13ffgss'],
      ]);

      const subSchema = createJsonSchemaStore(getNumberSchema());

      (schema.items as JsonArrayStore).migrateItems(subSchema);

      expect(value.getPlainValue()).toStrictEqual([
        [1.1, 2, 0],
        [3.67, 0.4, 129],
        [0, 0, 13],
      ]);
    });

    it('from boolean to string', () => {
      const schema = createJsonSchemaStore(
        getArraySchema(getArraySchema(getBooleanSchema())),
      ) as JsonArrayStore;
      const value = createJsonValueStore(schema, '', [
        [true, false, true],
        [false],
      ]);

      const subSchema = createJsonSchemaStore(getStringSchema());

      (schema.items as JsonArrayStore).migrateItems(subSchema);

      expect(value.getPlainValue()).toStrictEqual([
        ['true', 'false', 'true'],
        ['false'],
      ]);
    });

    it('from string to boolean', () => {
      const schema = createJsonSchemaStore(
        getArraySchema(getArraySchema(getStringSchema())),
      ) as JsonArrayStore;
      const value = createJsonValueStore(schema, '', [
        ['true', '4124', ''],
        ['False', 'false', '0'],
      ]);

      const subSchema = createJsonSchemaStore(getBooleanSchema());

      (schema.items as JsonArrayStore).migrateItems(subSchema);

      expect(value.getPlainValue()).toStrictEqual([
        [true, true, false],
        [false, false, true],
      ]);
    });

    it('from boolean to number', () => {
      const schema = createJsonSchemaStore(
        getArraySchema(getArraySchema(getBooleanSchema())),
      ) as JsonArrayStore;
      const value = createJsonValueStore(schema, '', [
        [true, false],
        [false, true],
      ]);

      const subSchema = createJsonSchemaStore(getNumberSchema());

      (schema.items as JsonArrayStore).migrateItems(subSchema);

      expect(value.getPlainValue()).toStrictEqual([
        [1, 0],
        [0, 1],
      ]);
    });

    it('from number to boolean', () => {
      const schema = createJsonSchemaStore(
        getArraySchema(getArraySchema(getNumberSchema())),
      ) as JsonArrayStore;
      const value = createJsonValueStore(schema, '', [
        [1, 100.1, 0, 4],
        [0, 1, 2],
      ]);

      const subSchema = createJsonSchemaStore(getBooleanSchema());

      (schema.items as JsonArrayStore).migrateItems(subSchema);

      expect(value.getPlainValue()).toStrictEqual([
        [true, true, false, true],
        [false, true, true],
      ]);
    });
  });
});
