import { JsonPatch } from '@revisium/schema-toolkit/types';
import { JsonSchema } from '@revisium/schema-toolkit/types';

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
  historyPatches: HistoryPatches[];
};
