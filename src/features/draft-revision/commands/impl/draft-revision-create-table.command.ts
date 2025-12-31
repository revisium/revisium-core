export interface DraftRevisionCreateTableCommandData {
  revisionId: string;
  tableId: string;
  system?: boolean;
}

export interface DraftRevisionCreateTableCommandReturnType {
  tableVersionId: string;
  tableCreatedId: string;
}

export class DraftRevisionCreateTableCommand {
  constructor(public readonly data: DraftRevisionCreateTableCommandData) {}
}
