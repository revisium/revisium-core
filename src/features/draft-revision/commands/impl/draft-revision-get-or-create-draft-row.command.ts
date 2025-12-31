export interface DraftRevisionGetOrCreateDraftRowCommandData {
  tableVersionId: string;
  rowId: string;
}

export interface DraftRevisionGetOrCreateDraftRowCommandReturnType {
  rowVersionId: string;
  previousRowVersionId: string;
  rowCreatedId: string;
  wasCreated: boolean;
}

export class DraftRevisionGetOrCreateDraftRowCommand {
  constructor(
    public readonly data: DraftRevisionGetOrCreateDraftRowCommandData,
  ) {}
}
