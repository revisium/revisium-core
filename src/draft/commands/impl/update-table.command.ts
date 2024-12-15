import { JsonPatch } from 'src/share/utils/schema/types/json-patch.types';

export class UpdateTableCommand {
  constructor(
    public data: {
      revisionId: string;
      tableId: string;
      patches: JsonPatch[];
    },
  ) {}
}
