import { TableChange, TableChangesFilters } from '../../types';
import { IPaginatedType } from 'src/features/share/pagination.interface';

export class GetTableChangesQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly compareWithRevisionId?: string;
      readonly first: number;
      readonly after?: string;
      readonly filters?: TableChangesFilters;
    },
  ) {}
}

export type GetTableChangesQueryData = GetTableChangesQuery['data'];

export type GetTableChangesQueryReturnType = IPaginatedType<TableChange>;
