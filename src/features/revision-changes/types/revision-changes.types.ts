export interface RevisionChangeSummary {
  total: number;
  added: number;
  modified: number;
  removed: number;
  renamed: number;
}

export interface RevisionChanges {
  revisionId: string;
  parentRevisionId: string | null;

  totalChanges: number;

  tablesSummary: RevisionChangeSummary;
  rowsSummary: RevisionChangeSummary;
}
