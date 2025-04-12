import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { traverseStore } from 'src/features/share/utils/schema/lib/traverseStore';
import { JsonSchemaStore } from 'src/features/share/utils/schema/model/schema/json-schema.store';
import {
  JsonSchema,
  JsonSchemaTypeName,
} from 'src/features/share/utils/schema/types/schema.types';
import { validateJsonFieldName } from 'src/features/share/utils/validateUrlLikeId/validateJsonFieldName';

export const getInvalidFieldNamesInSchema = (schema: JsonSchema) => {
  const schemaStore = createJsonSchemaStore(schema);

  const invalidFields: JsonSchemaStore[] = [];

  traverseStore(schemaStore, (item) => {
    if (item.parent?.type === JsonSchemaTypeName.Object) {
      if (!validateJsonFieldName(item.name)) {
        invalidFields.push(item);
      }
    }
  });

  return invalidFields;
};
