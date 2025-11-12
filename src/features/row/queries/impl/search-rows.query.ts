import { Row, Table } from '@prisma/client';
import { IPaginatedType } from 'src/features/share/pagination.interface';

export type SearchRowResult = {
  row: Row;
  table: Table;
  matches: SearchMatch[];
};

export type SearchMatch = {
  path: string;
  value: any;
  highlight?: string;
};

export type SearchRowsResponse = IPaginatedType<SearchRowResult>;

export class SearchRowsQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly query: string;
      readonly first?: number;
      readonly after?: string;
    },
  ) {}
}

export type SearchRowsQueryData = SearchRowsQuery['data'];
