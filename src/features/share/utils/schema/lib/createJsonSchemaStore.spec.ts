import {
  getArraySchema,
  getObjectSchema,
  getRefSchema,
  getStringSchema,
} from 'src/__tests__/utils/schema/schema.mocks';
import {
  createJsonSchemaStore,
  RefsType,
} from 'src/features/share/utils/schema/lib/createJsonSchemaStore';

describe('createJsonSchemaStore', () => {
  it('simple schema', () => {
    const schema = getObjectSchema({
      field: getStringSchema(),
    });

    schema.required.push('unexpected');

    expect(() => createJsonSchemaStore(schema)).toThrowError(
      'Not found required field "unexpected" in "properties"',
    );
  });

  it('complex schema', () => {
    const refSchema = getObjectSchema({
      refField: getStringSchema(),
    });
    const refs: RefsType = { 'ref-schema.json': refSchema };

    const nested = getObjectSchema({
      subField: getStringSchema(),
      subField2: getStringSchema({ foreignKey: 'tableId3' }),
      subField3: getArraySchema(getStringSchema({ foreignKey: 'tableId1' })),
      nestedRef: getObjectSchema({
        ref: getRefSchema('ref-schema.json'),
      }),
    });

    const schema = getObjectSchema({
      field: getStringSchema({
        foreignKey: 'tableId2',
      }),
      ids: getArraySchema(
        getStringSchema({
          foreignKey: 'tableId4',
        }),
      ),
      nested,
    });

    expect(createJsonSchemaStore(schema, refs)).toBeDefined();
    expect(schema).toStrictEqual(
      createJsonSchemaStore(schema, refs).getPlainSchema(),
    );

    nested.required.push('nestedUnexpected');

    expect(() => createJsonSchemaStore(schema)).toThrowError(
      'Not found required field "nestedUnexpected" in "properties"',
    );
  });

  it('should throw error if there is $ref schema', () => {
    const schema = getObjectSchema({
      field: getRefSchema('invalid-schema.json'),
    });

    expect(() => createJsonSchemaStore(schema)).toThrowError(
      'Not found schema for $ref="invalid-schema.json"',
    );
  });
});
