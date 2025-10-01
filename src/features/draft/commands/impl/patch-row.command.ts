import { JsonValuePatchReplace } from '@revisium/schema-toolkit/types';

export class PatchRowCommand {
  constructor(
    public readonly data: {
      patches: JsonValuePatchReplace[];
      revisionId: string;
      tableId: string;
      rowId: string;
    },
  ) {}
}

export type PatchRowCommandData = PatchRowCommand['data'];

export type PatchRowCommandReturnType = {
  tableVersionId: string;
  previousTableVersionId: string;
  rowVersionId: string;
  previousRowVersionId: string;
};
