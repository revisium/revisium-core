export interface DraftRevisionRevertCommandData {
  branchId: string;
}

export interface DraftRevisionRevertCommandReturnType {
  draftRevisionId: string;
}

export class DraftRevisionRevertCommand {
  constructor(public readonly data: DraftRevisionRevertCommandData) {}
}
