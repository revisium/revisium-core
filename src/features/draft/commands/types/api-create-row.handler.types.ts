import { GetRowByIdQueryReturnType } from 'src/features/row/queries/impl';
import { GetTableByIdReturnType } from 'src/features/table/queries/types';

export type ApiCreateRowHandlerReturnType = {
  table: NonNullable<GetTableByIdReturnType>;
  previousVersionTableId: string;
  row: NonNullable<GetRowByIdQueryReturnType>;
};
