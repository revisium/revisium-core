import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';

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
