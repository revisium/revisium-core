import { GetTablesReturnType } from 'src/features/table/queries/types';

export class GetTablesQuery {
  constructor(
    public data: {
      readonly revisionId: string;
      readonly first: number;
      readonly after?: string;
    },
  ) {}
}

export type GetTablesQueryData = GetTablesQuery['data'];

export type GetTablesQueryReturnType = GetTablesReturnType;
