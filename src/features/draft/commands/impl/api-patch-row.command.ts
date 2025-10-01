import { GetRowByIdQueryReturnType } from 'src/features/row/queries/impl';
import { JsonValuePatchReplace } from '@revisium/schema-toolkit/types';
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
  row: GetRowByIdQueryReturnType;
  previousVersionRowId: string;
};
