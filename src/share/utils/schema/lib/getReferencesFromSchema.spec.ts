import {
  getArraySchema,
  getObjectSchema,
  getStringSchema,
} from 'src/__tests__/utils/schema/schema.mocks';
import { createJsonSchemaStore } from 'src/share/utils/schema/lib/createJsonSchemaStore';
import { getReferencesFromSchema } from 'src/share/utils/schema/lib/getReferencesFromSchema';

describe('getReferenceFromSchema', () => {
  it('string', () => {
    const schema = getStringSchema({
      reference: 'tableId',
    });

    expect(
      getReferencesFromSchema(createJsonSchemaStore(schema)),
    ).toStrictEqual(['tableId']);
  });

  it('array / string', () => {
    const schema = getArraySchema(
      getStringSchema({
        reference: 'tableId',
      }),
    );

    expect(
      getReferencesFromSchema(createJsonSchemaStore(schema)),
    ).toStrictEqual(['tableId']);
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

    expect(
      getReferencesFromSchema(createJsonSchemaStore(schema)),
    ).toStrictEqual(['tableId1', 'tableId2']);
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
        subField3: getArraySchema(getStringSchema({ reference: 'tableId1' })),
      }),
    });

    expect(
      getReferencesFromSchema(createJsonSchemaStore(schema)),
    ).toStrictEqual(['tableId1', 'tableId2', 'tableId3', 'tableId4']);
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

    expect(
      getReferencesFromSchema(createJsonSchemaStore(schema)),
    ).toStrictEqual(['tableId1', 'tableId2']);
  });
});
