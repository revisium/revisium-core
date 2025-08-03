import { Prisma } from '@prisma/client';

export class CreateTableCommand {
  constructor(
    public data: {
      revisionId: string;
      tableId: string;
      schema: Prisma.InputJsonValue;
    },
  ) {}
}

export type CreateTableCommandData = CreateTableCommand['data'];
