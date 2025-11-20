import { Prisma } from 'src/__generated__/client';

export class UpdateRowCommand {
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
