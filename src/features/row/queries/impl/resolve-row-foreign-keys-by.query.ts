import { IPaginatedType } from 'src/features/share/pagination.interface';
import { RowWithContext } from 'src/features/share/types/row-with-context.types';

export class ResolveRowForeignKeysByQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
      readonly rowId: string;
      readonly foreignKeyByTableId: string;
      readonly first: number;
      readonly after?: string;
    },
  ) {}
}

export type ResolveRowForeignKeysByQueryData =
  ResolveRowForeignKeysByQuery['data'];

export type ResolveRowForeignKeysByReturnType = IPaginatedType<RowWithContext>;
