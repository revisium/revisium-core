import { Prisma } from '@prisma/client';

export class ApiCreateRowCommand {
  constructor(
    public readonly data: {
      data: Prisma.InputJsonValue;
      revisionId: string;
      tableId: string;
      rowId: string;
    },
  ) {}
}
