import { JsonPatch } from 'src/features/share/utils/schema/types/json-patch.types';
import { TableMigrations } from 'src/features/share/utils/schema/types/migration';
import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';

export class GetTableSchemaQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
    },
  ) {}
}

export type HistoryPatches = {
  patches: JsonPatch[];
  hash: string;
  date: string;
};

export type GetTableSchemaQueryReturnType = {
  schema: JsonSchema;
  hash: string;
  tableMigrations: TableMigrations;
};
