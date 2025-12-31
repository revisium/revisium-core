export interface DraftRevisionRemoveTableCommandData {
  revisionId: string;
  tableId: string;
}

export interface DraftRevisionRemoveTableCommandReturnType {
  tableVersionId: string;
  deleted: boolean;
}

export class DraftRevisionRemoveTableCommand {
  constructor(public readonly data: DraftRevisionRemoveTableCommandData) {}
}
