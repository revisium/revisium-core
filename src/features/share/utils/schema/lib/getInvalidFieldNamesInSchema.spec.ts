import {
  getArraySchema,
  getObjectSchema,
  getStringSchema,
} from 'src/__tests__/utils/schema/schema.mocks';
import { getInvalidFieldNamesInSchema } from 'src/features/share/utils/schema/lib/getInvalidFieldNamesInSchema';

describe('getInvalidFieldNamesInSchema', () => {
  it('should find invalid field', () => {
    const schema = getObjectSchema({
      ['1test']: getStringSchema(),
      ['field']: getStringSchema(),
    });

    const invalidFields = getInvalidFieldNamesInSchema(schema).map(
      (item) => item.name,
    );

    expect(invalidFields).toStrictEqual(['1test']);
  });

  it('should find a few invalid fields', () => {
    const schema = getObjectSchema({
      ['1test']: getStringSchema(),
      ['field']: getStringSchema(),
      nested: getObjectSchema({
        ['--invalid']: getStringSchema(),
        array: getArraySchema(
          getObjectSchema({
            ['$items']: getStringSchema(),
          }),
        ),
      }),
    });

    const invalidFields = getInvalidFieldNamesInSchema(schema).map(
      (item) => item.name,
    );

    expect(invalidFields).toStrictEqual(['1test', '--invalid', '$items']);
  });
});
