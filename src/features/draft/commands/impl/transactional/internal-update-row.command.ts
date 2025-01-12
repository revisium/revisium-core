import { Prisma } from '@prisma/client';

export class InternalUpdateRowCommand {
  constructor(
    public readonly data: {
      data: Prisma.InputJsonValue;
      revisionId: string;
      tableId: string;
      rowId: string;
      schemaHash: string;
    },
  ) {}
}

export type InternalUpdateRowCommandReturnType = {
  tableVersionId: string;
  previousTableVersionId: string;
  rowVersionId: string;
  previousRowVersionId: string;
};
