import { Prisma } from 'src/__generated__/client';

export interface UpdateRowsRowInput {
  rowId: string;
  data: Prisma.InputJsonValue;
}

export class UpdateRowsCommand {
  constructor(
    public readonly data: {
      revisionId: string;
      tableId: string;
      rows: UpdateRowsRowInput[];
      isRestore?: boolean;
    },
  ) {}
}

export type UpdateRowsCommandData = UpdateRowsCommand['data'];
