export class RemoveRowsCommand {
  constructor(
    public readonly data: {
      revisionId: string;
      tableId: string;
      rowIds: string[];
      avoidCheckingSystemTable?: boolean;
    },
  ) {}
}

export type RemoveRowsCommandData = RemoveRowsCommand['data'];
