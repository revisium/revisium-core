export interface DraftRevisionRenameTableCommandData {
  revisionId: string;
  tableId: string;
  nextTableId: string;
}

export interface DraftRevisionRenameTableCommandReturnType {
  tableVersionId: string;
  previousTableVersionId: string;
}

export class DraftRevisionRenameTableCommand {
  constructor(public readonly data: DraftRevisionRenameTableCommandData) {}
}
