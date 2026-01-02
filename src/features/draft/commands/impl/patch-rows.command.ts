import { JsonValuePatchReplace } from '@revisium/schema-toolkit/types';

export interface PatchRowsRowInput {
  rowId: string;
  patches: JsonValuePatchReplace[];
}

export class PatchRowsCommand {
  constructor(
    public readonly data: {
      revisionId: string;
      tableId: string;
      rows: PatchRowsRowInput[];
    },
  ) {}
}

export type PatchRowsCommandData = PatchRowsCommand['data'];
