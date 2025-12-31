export interface DraftRevisionCommitCommandData {
  branchId: string;
  comment?: string;
}

export interface DraftRevisionCommitCommandReturnType {
  previousHeadRevisionId: string;
  previousDraftRevisionId: string;
  nextDraftRevisionId: string;
}

export class DraftRevisionCommitCommand {
  constructor(public readonly data: DraftRevisionCommitCommandData) {}
}
