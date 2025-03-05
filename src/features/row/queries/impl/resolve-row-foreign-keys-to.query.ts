export class ResolveRowForeignKeysToQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
      readonly rowId: string;
      readonly foreignKeyToTableId: string;
      readonly first: number;
      readonly after?: string;
    },
  ) {}
}
