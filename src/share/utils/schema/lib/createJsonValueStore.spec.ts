import {
  getArraySchema,
  getNumberSchema,
  getObjectSchema,
  getStringSchema,
} from 'src/__tests__/utils/schema/schema.mocks';
import { createJsonSchemaStore } from 'src/share/utils/schema/lib/createJsonSchemaStore';
import { createJsonValueStore } from 'src/share/utils/schema/lib/createJsonValueStore';
import { JsonObject } from 'src/share/utils/schema/types/json.types';

describe('createJsonValueStore', () => {
  it('object', () => {
    const schema = getObjectSchema({
      fieldString: getStringSchema(),
      fieldArray: getArraySchema(getNumberSchema()),
      nested: getObjectSchema({ value: getNumberSchema() }),
    });

    const value: JsonObject = {
      fieldString: 'field',
      fieldArray: [1, 2, 3, 4, 5],
      nested: {
        value: 100,
      },
    };

    const expectedValue = createJsonValueStore(
      createJsonSchemaStore(schema),
      '',
      value,
    ).getPlainValue();

    expect(expectedValue).toStrictEqual(value);
  });

  it('arrays of objects', () => {
    const schema = getObjectSchema({
      items: getArraySchema(
        getObjectSchema({
          field: getStringSchema(),
          ids: getArraySchema(getNumberSchema()),
        }),
      ),
    });

    const value: JsonObject = {
      items: [
        {
          field: 'field1',
          ids: [1, 2, 3],
        },
        {
          field: 'field2',
          ids: [5, 6, 7, 8, 9],
        },
      ],
    };

    const expectedValue = createJsonValueStore(
      createJsonSchemaStore(schema),
      '',
      value,
    ).getPlainValue();

    expect(expectedValue).toStrictEqual(value);
  });

  it('unexpected field in value', () => {
    const schema = getObjectSchema({
      value: getObjectSchema({
        field1: getStringSchema(),
      }),
    });

    const value: JsonObject = {
      value: {
        field1: 'field1',
        field2: 'field2',
      },
    };

    expect(() =>
      createJsonValueStore(
        createJsonSchemaStore(schema),
        '',
        value,
      ).getPlainValue(),
    ).toThrowError('Invalid item');
  });

  it('no match with schema', () => {
    const schema = getObjectSchema({
      value: getObjectSchema({
        fieldSchema: getStringSchema(),
      }),
    });

    const value: JsonObject = {
      value: {
        fieldValue: 'fieldValue',
      },
    };

    expect(() =>
      createJsonValueStore(
        createJsonSchemaStore(schema),
        '',
        value,
      ).getPlainValue(),
    ).toThrowError('Invalid item');
  });
});
