import { Table } from 'src/__generated__/client';

export class GetTableQuery {
  constructor(public data: { revisionId: string; tableId: string }) {}
}

export type GetTableQueryData = GetTableQuery['data'];

export type GetTableQueryReturnType = Table;
