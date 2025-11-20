import { Prisma } from 'src/__generated__/client';

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
