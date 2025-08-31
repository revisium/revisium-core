import { RowWithContext } from 'src/features/share/types/row-with-context.types';

export class GetRowByIdQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
      readonly rowVersionId: string;
    },
  ) {}
}

export type GetRowByIdQueryData = GetRowByIdQuery['data'];

export type GetRowByIdQueryReturnType = RowWithContext | null;
