export class ResolveTableCountForeignKeysToQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
    },
  ) {}
}
