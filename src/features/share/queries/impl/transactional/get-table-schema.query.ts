import { JsonPatch } from 'src/features/share/utils/schema/types/json-patch.types';
import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';

export class GetTableSchemaQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
    },
  ) {}
}

export type HistoryPatches = { patches: JsonPatch[]; hash: string };

export type GetTableSchemaQueryReturnType = {
  schema: JsonSchema;
  hash: string;
  historyPatches: HistoryPatches[];
};
