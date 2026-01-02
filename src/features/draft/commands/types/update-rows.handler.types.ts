export interface UpdateRowsUpdatedRow {
  rowId: string;
  rowVersionId: string;
  previousRowVersionId: string;
}

export type UpdateRowsHandlerReturnType = {
  tableVersionId: string;
  previousTableVersionId: string;
  updatedRows: UpdateRowsUpdatedRow[];
};
