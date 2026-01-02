export interface PatchRowsPatchedRow {
  rowId: string;
  rowVersionId: string;
  previousRowVersionId: string;
}

export type PatchRowsHandlerReturnType = {
  tableVersionId: string;
  previousTableVersionId: string;
  patchedRows: PatchRowsPatchedRow[];
};
