export interface DraftRevisionRecomputeHasChangesCommandData {
  revisionId: string;
  tableId: string;
}

export class DraftRevisionRecomputeHasChangesCommand {
  constructor(
    public readonly data: DraftRevisionRecomputeHasChangesCommandData,
  ) {}
}
