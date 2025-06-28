import { JsonValuePatch } from 'src/features/share/utils/schema/types/json-value-patch.types';
import { JsonValue } from 'src/features/share/utils/schema/types/json.types';

export interface SuggestionDto {
  projectName: string;
  tableId: string;
  rowId: string;
  schema: Record<string, any>;
  data: JsonValue;
  userPrompt: string;
}

export interface RowSuggestion {
  data: JsonValue;
  patches: JsonValuePatch[];
}
