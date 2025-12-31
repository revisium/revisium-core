export interface DraftRevisionRemoveRowsCommandData {
  revisionId: string;
  tableId: string;
  rowIds: string[];
}

export interface DraftRevisionRemovedRowResult {
  rowVersionId: string;
  deleted: boolean;
}

export interface DraftRevisionRemoveRowsCommandReturnType {
  tableVersionId: string;
  previousTableVersionId: string;
  removedRows: DraftRevisionRemovedRowResult[];
}

export class DraftRevisionRemoveRowsCommand {
  constructor(public readonly data: DraftRevisionRemoveRowsCommandData) {}
}
