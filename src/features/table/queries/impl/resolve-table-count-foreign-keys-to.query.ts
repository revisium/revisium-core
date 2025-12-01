export class ResolveTableCountForeignKeysToQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
    },
  ) {}
}

export type ResolveTableCountForeignKeysToQueryData =
  ResolveTableCountForeignKeysToQuery['data'];

export type ResolveTableCountForeignKeysToQueryReturnType = number;
