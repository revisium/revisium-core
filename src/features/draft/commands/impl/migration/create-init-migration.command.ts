import { JsonSchema } from '@revisium/schema-toolkit/types';

export class CreateInitMigrationCommand {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
      readonly schema: JsonSchema;
    },
  ) {}
}

export type CreateInitMigrationCommandData = CreateInitMigrationCommand['data'];

export type CreateInitMigrationCommandReturnType = boolean;
