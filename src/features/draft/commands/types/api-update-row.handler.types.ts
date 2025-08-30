import { GetRowByIdQueryReturnType } from 'src/features/row/queries/impl';
import { GetTableByIdReturnType } from 'src/features/table/queries/types';

export type ApiUpdateRowHandlerReturnType = {
  table: GetTableByIdReturnType;
  previousVersionTableId: string;
  row: GetRowByIdQueryReturnType;
  previousVersionRowId: string;
};
