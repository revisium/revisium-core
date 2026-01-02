import { JsonValuePatchReplace } from '@revisium/schema-toolkit/types';

export interface ApiPatchRowsRowInput {
  rowId: string;
  patches: JsonValuePatchReplace[];
}

export class ApiPatchRowsCommand {
  constructor(
    public readonly data: {
      revisionId: string;
      tableId: string;
      rows: ApiPatchRowsRowInput[];
    },
  ) {}
}

export type ApiPatchRowsCommandData = ApiPatchRowsCommand['data'];
