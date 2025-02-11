import { GetRowByIdReturnType } from 'src/features/row/queries/types';
import { GetTableByIdReturnType } from 'src/features/table/queries/types';

export class ApiRenameRowCommand {
  constructor(
    public readonly data: {
      revisionId: string;
      tableId: string;
      rowId: string;
      nextRowId: string;
    },
  ) {}
}

export type ApiRenameRowCommandReturnType = {
  table: GetTableByIdReturnType;
  previousVersionTableId: string;
  row: GetRowByIdReturnType;
  previousVersionRowId: string;
};
