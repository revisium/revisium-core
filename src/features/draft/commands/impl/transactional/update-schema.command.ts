import { JsonPatch } from 'src/features/share/utils/schema/types/json-patch.types';
import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';

export class UpdateSchemaCommand {
  constructor(
    public readonly data: {
      revisionId: string;
      tableId: string;
      schema: JsonSchema;
      patches: JsonPatch[];
      skipCreatingMigration?: boolean;
    },
  ) {}
}

export type UpdateSchemaCommandReturnType = boolean;
