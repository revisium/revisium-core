import { JsonPatch } from '@revisium/schema-toolkit/types';

export class ApiUpdateTableCommand {
  constructor(
    public data: {
      revisionId: string;
      tableId: string;
      patches: JsonPatch[];
    },
  ) {}
}

export type ApiUpdateTableCommandData = ApiUpdateTableCommand['data'];
