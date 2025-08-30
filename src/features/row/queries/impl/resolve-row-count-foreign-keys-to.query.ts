export class ResolveRowCountForeignKeysToQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
      readonly rowId: string;
    },
  ) {}
}

export type ResolveRowCountForeignKeysToQueryData =
  ResolveRowCountForeignKeysToQuery['data'];

export type ResolveRowCountForeignKeysToQueryReturnType = number;
