import { TableViewsData } from 'src/features/views/types';

export type GetTableViewsQueryData = {
  readonly revisionId: string;
  readonly tableId: string;
};

export class GetTableViewsQuery {
  constructor(public readonly data: GetTableViewsQueryData) {}
}

export type GetTableViewsQueryReturnType = TableViewsData;
