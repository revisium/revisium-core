import { Prisma } from '@prisma/client';

export class InternalCreateRowCommand {
  constructor(
    public readonly data: {
      data: Prisma.InputJsonValue;
      revisionId: string;
      tableId: string;
      rowId: string;
      schemaHash: string;
      meta?: Prisma.InputJsonValue;
    },
  ) {}
}

export type InternalCreateRowCommandReturnType = {
  tableVersionId: string;
  previousTableVersionId: string;
  rowVersionId: string;
};
