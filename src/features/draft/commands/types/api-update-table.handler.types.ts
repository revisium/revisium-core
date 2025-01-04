import { GetTableByIdReturnType } from 'src/features/table/queries/types';

export type ApiUpdateTableHandlerReturnType = {
  table: GetTableByIdReturnType;
  previousVersionTableId: string;
};
