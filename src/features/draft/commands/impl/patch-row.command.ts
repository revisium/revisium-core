import { Prisma } from '@prisma/client';

export class PatchRowCommand {
  constructor(
    public readonly data: {
      patches: { path: string; value: Prisma.InputJsonValue }[];
      revisionId: string;
      tableId: string;
      rowId: string;
    },
  ) {}
}

export type PatchRowCommandData = PatchRowCommand['data'];

export type PatchRowCommandReturnType = {
  tableVersionId: string;
  previousTableVersionId: string;
  rowVersionId: string;
  previousRowVersionId: string;
};
