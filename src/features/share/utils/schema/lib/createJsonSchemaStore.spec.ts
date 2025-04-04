import {
  getArraySchema,
  getObjectSchema,
  getStringSchema,
} from 'src/__tests__/utils/schema/schema.mocks';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';

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
    const nested = getObjectSchema({
      subField: getStringSchema(),
      subField2: getStringSchema({ foreignKey: 'tableId3' }),
      subField3: getArraySchema(getStringSchema({ foreignKey: 'tableId1' })),
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

    expect(createJsonSchemaStore(schema)).toBeDefined();

    nested.required.push('nestedUnexpected');

    expect(() => createJsonSchemaStore(schema)).toThrowError(
      'Not found required field "nestedUnexpected" in "properties"',
    );
  });
});
