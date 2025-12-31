export interface DraftRevisionRenameRowItem {
  rowId: string;
  nextRowId: string;
}

export interface DraftRevisionRenameRowsCommandData {
  revisionId: string;
  tableId: string;
  renames: DraftRevisionRenameRowItem[];
}

export interface DraftRevisionRenamedRowResult {
  rowVersionId: string;
  previousRowVersionId: string;
}

export interface DraftRevisionRenameRowsCommandReturnType {
  tableVersionId: string;
  previousTableVersionId: string;
  tableCreatedId: string;
  renamedRows: DraftRevisionRenamedRowResult[];
}

export class DraftRevisionRenameRowsCommand {
  constructor(public readonly data: DraftRevisionRenameRowsCommandData) {}
}
