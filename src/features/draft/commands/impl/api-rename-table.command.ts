import { GetTableByIdReturnType } from 'src/features/table/queries/types';

export class ApiRenameTableCommand {
  constructor(
    public data: {
      revisionId: string;
      tableId: string;
      nextTableId: string;
    },
  ) {}
}

export type ApiRenameTableCommandData = ApiRenameTableCommand['data'];

export type ApiRenameTableCommandReturnType = {
  table: GetTableByIdReturnType;
  previousVersionTableId: string;
};
