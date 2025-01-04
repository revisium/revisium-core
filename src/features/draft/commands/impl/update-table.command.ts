import { JsonPatch } from 'src/features/share/utils/schema/types/json-patch.types';

export class UpdateTableCommand {
  constructor(
    public data: {
      revisionId: string;
      tableId: string;
      patches: JsonPatch[];
    },
  ) {}
}
