import { Prisma } from '@prisma/client';
import { JsonValuePatch } from 'src/features/share/utils/schema/types/json-value-patch.types';
import { JsonValue } from 'src/features/share/utils/schema/types/json.types';

export class GetRowSuggestionQuery {
  constructor(
    public readonly data: {
      revisionId: string;
      tableId: string;
      rowId: string;
      data: Prisma.InputJsonValue;
      prompt: string;
    },
  ) {}
}

export type GetRowSuggestionQueryData = GetRowSuggestionQuery['data'];

export type GetRowSuggestionQueryReturnType = {
  data: JsonValue;
  patches: JsonValuePatch[];
};
