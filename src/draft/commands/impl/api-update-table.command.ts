import { JsonPatch } from 'src/share/utils/schema/types/json-patch.types';

export class ApiUpdateTableCommand {
  constructor(
    public data: {
      revisionId: string;
      tableId: string;
      patches: JsonPatch[];
    },
  ) {}
}
