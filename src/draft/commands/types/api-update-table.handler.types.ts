import { GetTableByIdReturnType } from 'src/table/queries/types';

export type ApiUpdateTableHandlerReturnType = {
  table: GetTableByIdReturnType;
  previousVersionTableId: string;
};
