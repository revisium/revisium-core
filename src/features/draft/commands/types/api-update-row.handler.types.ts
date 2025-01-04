import { GetRowByIdReturnType } from 'src/features/row/queries/types';
import { GetTableByIdReturnType } from 'src/features/table/queries/types';

export type ApiUpdateRowHandlerReturnType = {
  table: GetTableByIdReturnType;
  previousVersionTableId: string;
  row: GetRowByIdReturnType;
  previousVersionRowId: string;
};
