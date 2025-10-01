import { JsonPatch } from '@revisium/schema-toolkit/types';
import { JsonSchema } from '@revisium/schema-toolkit/types';

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
