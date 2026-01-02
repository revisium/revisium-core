import { Prisma } from 'src/__generated__/client';

export interface CreateRowsRowInput {
  rowId: string;
  data: Prisma.InputJsonValue;
}

export class CreateRowsCommand {
  constructor(
    public readonly data: {
      revisionId: string;
      tableId: string;
      rows: CreateRowsRowInput[];
    },
  ) {}
}

export type CreateRowsCommandData = CreateRowsCommand['data'];
