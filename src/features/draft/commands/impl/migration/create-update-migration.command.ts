import { JsonPatch } from 'src/features/share/utils/schema/types/json-patch.types';
import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';

export class CreateUpdateMigrationCommand {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
      readonly schema: JsonSchema;
      readonly patches: JsonPatch[];
    },
  ) {}
}

export type CreateUpdateMigrationCommandData =
  CreateUpdateMigrationCommand['data'];

export type CreateUpdateMigrationCommandReturnType = boolean;
