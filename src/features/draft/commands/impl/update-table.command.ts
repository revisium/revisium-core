import { JsonPatch } from '@revisium/schema-toolkit/types';

export class UpdateTableCommand {
  constructor(
    public data: {
      revisionId: string;
      tableId: string;
      patches: JsonPatch[];
    },
  ) {}
}
