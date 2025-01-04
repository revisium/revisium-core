export class GetRowQuery {
  constructor(
    public readonly data: {
      revisionId: string;
      tableId: string;
      rowId: string;
    },
  ) {}
}
