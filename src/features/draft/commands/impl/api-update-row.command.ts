import { Prisma } from '@prisma/client';

export class ApiUpdateRowCommand {
  constructor(
    public readonly data: {
      data: Prisma.InputJsonValue;
      revisionId: string;
      tableId: string;
      rowId: string;
      skipCheckingNotSystemTable?: boolean;
      isRestore?: boolean;
    },
  ) {}
}
