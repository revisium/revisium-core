import { GetRowByIdReturnType } from 'src/row/queries/types';
import { GetTableByIdReturnType } from 'src/table/queries/types';

export type ApiCreateRowHandlerReturnType = {
  table: NonNullable<GetTableByIdReturnType>;
  previousVersionTableId: string;
  row: NonNullable<GetRowByIdReturnType>;
};
