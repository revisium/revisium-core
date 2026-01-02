import { Prisma } from 'src/__generated__/client';

export interface ApiCreateRowsRowInput {
  rowId: string;
  data: Prisma.InputJsonValue;
}

export class ApiCreateRowsCommand {
  constructor(
    public readonly data: {
      revisionId: string;
      tableId: string;
      rows: ApiCreateRowsRowInput[];
      isRestore?: boolean;
    },
  ) {}
}

export type ApiCreateRowsCommandData = ApiCreateRowsCommand['data'];
