import { RowWithContext } from 'src/features/share/types/row-with-context.types';

export class GetRowQuery {
  constructor(
    public readonly data: {
      revisionId: string;
      tableId: string;
      rowId: string;
    },
  ) {}
}

export type GetRowQueryData = GetRowQuery['data'];

export type GetRowQueryReturnType = RowWithContext | null;
