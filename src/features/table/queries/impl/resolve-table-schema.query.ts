import { JsonSchema } from '@revisium/schema-toolkit/types';

export class ResolveTableSchemaQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
    },
  ) {}
}

export type ResolveTableSchemaQueryData = ResolveTableSchemaQuery['data'];

export type ResolveTableSchemaQueryReturnType = JsonSchema;
