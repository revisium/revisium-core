export class RemoveRowCommand {
  constructor(
    public readonly data: {
      revisionId: string;
      tableId: string;
      rowId: string;
      avoidCheckingSystemTable?: boolean;
    },
  ) {}
}
