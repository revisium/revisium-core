export interface CreateRowsCreatedRow {
  rowId: string;
  rowVersionId: string;
}

export type CreateRowsHandlerReturnType = {
  tableVersionId: string;
  previousTableVersionId: string;
  createdRows: CreateRowsCreatedRow[];
};
