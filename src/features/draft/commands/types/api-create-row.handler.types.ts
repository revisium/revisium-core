import { GetRowByIdReturnType } from 'src/features/row/queries/types';
import { GetTableByIdReturnType } from 'src/features/table/queries/types';

export type ApiCreateRowHandlerReturnType = {
  table: NonNullable<GetTableByIdReturnType>;
  previousVersionTableId: string;
  row: NonNullable<GetRowByIdReturnType>;
};
