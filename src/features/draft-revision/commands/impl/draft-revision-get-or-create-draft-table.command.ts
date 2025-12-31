export interface DraftRevisionGetOrCreateDraftTableCommandData {
  revisionId: string;
  tableId: string;
}

export interface DraftRevisionGetOrCreateDraftTableCommandReturnType {
  tableVersionId: string;
  previousTableVersionId: string;
  tableCreatedId: string;
  wasCreated: boolean;
}

export class DraftRevisionGetOrCreateDraftTableCommand {
  constructor(
    public readonly data: DraftRevisionGetOrCreateDraftTableCommandData,
  ) {}
}
