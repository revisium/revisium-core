import { Prisma } from '@prisma/client';

export class CreateRowCommand {
  constructor(
    public readonly data: {
      data: Prisma.InputJsonValue;
      revisionId: string;
      tableId: string;
      rowId: string;
      isRestore?: boolean;
    },
  ) {}
}
