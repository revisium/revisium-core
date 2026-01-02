import { Prisma } from 'src/__generated__/client';

export interface ApiUpdateRowsRowInput {
  rowId: string;
  data: Prisma.InputJsonValue;
}

export class ApiUpdateRowsCommand {
  constructor(
    public readonly data: {
      revisionId: string;
      tableId: string;
      rows: ApiUpdateRowsRowInput[];
    },
  ) {}
}

export type ApiUpdateRowsCommandData = ApiUpdateRowsCommand['data'];
