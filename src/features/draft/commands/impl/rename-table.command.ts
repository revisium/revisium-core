export class RenameTableCommand {
  constructor(
    public data: {
      revisionId: string;
      tableId: string;
      nextTableId: string;
    },
  ) {}
}

export type RenameTableCommandReturnType = {
  tableVersionId: string;
  previousTableVersionId: string;
};
