export class FindRowsInTableQuery {
  constructor(
    public readonly data: {
      tableVersionId: string;
      rowIds: string[];
    },
  ) {}
}
