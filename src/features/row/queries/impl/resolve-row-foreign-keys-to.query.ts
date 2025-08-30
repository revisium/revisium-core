import { IPaginatedType } from 'src/features/share/pagination.interface';
import { RowWithContext } from 'src/features/share/types/row-with-context.types';

export class ResolveRowForeignKeysToQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
      readonly rowId: string;
      readonly foreignKeyToTableId: string;
      readonly first: number;
      readonly after?: string;
    },
  ) {}
}

export type ResolveRowForeignKeysToQueryData =
  ResolveRowForeignKeysToQuery['data'];

export type ResolveRowForeignKeysToReturnType = IPaginatedType<RowWithContext>;
