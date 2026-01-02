import { GetRowByIdQueryReturnType } from 'src/features/row/queries/impl';
import { GetTableByIdReturnType } from 'src/features/table/queries/types';

export type ApiPatchRowsHandlerReturnType = {
  table: NonNullable<GetTableByIdReturnType>;
  previousVersionTableId: string;
  rows: NonNullable<GetRowByIdQueryReturnType>[];
};
