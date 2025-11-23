import { RowChange, RowChangesFilters } from '../../types';
import { IPaginatedType } from 'src/features/share/pagination.interface';

export class GetRowChangesQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly compareWithRevisionId?: string;
      readonly first: number;
      readonly after?: string;
      readonly filters?: RowChangesFilters;
    },
  ) {}
}

export type GetRowChangesQueryData = GetRowChangesQuery['data'];

export type GetRowChangesQueryReturnType = IPaginatedType<RowChange>;
