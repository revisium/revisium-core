import { Prisma } from 'src/__generated__/client';

export class InternalUpdateRowCommand {
  constructor(
    public readonly data: {
      data: Prisma.InputJsonValue;
      revisionId: string;
      tableId: string;
      rowId: string;
      schemaHash: string;
      meta?: Prisma.InputJsonValue;
      publishedAt?: string;
    },
  ) {}
}

export type InternalUpdateRowCommandReturnType = {
  tableVersionId: string;
  previousTableVersionId: string;
  rowVersionId: string;
  previousRowVersionId: string;
};
