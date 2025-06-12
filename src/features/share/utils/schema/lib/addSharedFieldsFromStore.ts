import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';

export const addSharedFieldsFromState = <T extends JsonSchema = JsonSchema>(
  schema: T,
  state: { title?: string; description?: string; deprecated?: boolean },
): T => {
  if (state.title) {
    schema.title = state.title;
  }

  if (state.description) {
    schema.description = state.description;
  }

  if (state.deprecated) {
    schema.deprecated = state.deprecated;
  }

  return schema;
};
