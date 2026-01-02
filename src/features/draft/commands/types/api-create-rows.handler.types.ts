import { GetRowByIdQueryReturnType } from 'src/features/row/queries/impl';
import { GetTableByIdReturnType } from 'src/features/table/queries/types';

export type ApiCreateRowsHandlerReturnType = {
  table: NonNullable<GetTableByIdReturnType>;
  previousVersionTableId: string;
  rows: NonNullable<GetRowByIdQueryReturnType>[];
};
