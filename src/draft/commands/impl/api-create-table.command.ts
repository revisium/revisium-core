import { Prisma } from '@prisma/client';

export class ApiCreateTableCommand {
  constructor(
    public data: {
      revisionId: string;
      tableId: string;
      schema: Prisma.InputJsonValue;
    },
  ) {}
}
