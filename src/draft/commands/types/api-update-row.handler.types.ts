import { GetRowByIdReturnType } from 'src/row/queries/types';
import { GetTableByIdReturnType } from 'src/table/queries/types';

export type ApiUpdateRowHandlerReturnType = {
  table: GetTableByIdReturnType;
  previousVersionTableId: string;
  row: GetRowByIdReturnType;
  previousVersionRowId: string;
};
