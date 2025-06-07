import { GetRowByIdReturnType } from 'src/features/row/queries/types';
import { JsonValuePatchReplace } from 'src/features/share/utils/schema/types/json-value-patch.types';
import { GetTableByIdReturnType } from 'src/features/table/queries/types';

export class ApiPatchRowCommand {
  constructor(
    public readonly data: {
      patches: JsonValuePatchReplace[];
      revisionId: string;
      tableId: string;
      rowId: string;
      skipCheckingNotSystemTable?: boolean;
    },
  ) {}
}

export type ApiPatchRowCommandData = ApiPatchRowCommand['data'];

export type ApiPatchRowCommandReturnType = {
  table: GetTableByIdReturnType;
  previousVersionTableId: string;
  row: GetRowByIdReturnType;
  previousVersionRowId: string;
};
