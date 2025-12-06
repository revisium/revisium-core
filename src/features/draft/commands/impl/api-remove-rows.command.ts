export class ApiRemoveRowsCommand {
  constructor(
    public readonly data: {
      revisionId: string;
      tableId: string;
      rowIds: string[];
    },
  ) {}
}

export type ApiRemoveRowsCommandData = ApiRemoveRowsCommand['data'];
