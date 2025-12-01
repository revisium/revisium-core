import { Table } from 'src/__generated__/client';
import { IPaginatedType } from 'src/features/share/pagination.interface';

export class ResolveTableForeignKeysToQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
      readonly first: number;
      readonly after?: string;
    },
  ) {}
}

export type ResolveTableForeignKeysToQueryData =
  ResolveTableForeignKeysToQuery['data'];

export type ResolveTableForeignKeysToQueryReturnType = IPaginatedType<Table>;
