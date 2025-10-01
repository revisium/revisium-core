import { JsonPatch } from '@revisium/schema-toolkit/types';
import { JsonSchema } from '@revisium/schema-toolkit/types';

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
