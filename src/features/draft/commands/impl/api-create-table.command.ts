import { Prisma } from 'src/__generated__/client';

export class ApiCreateTableCommand {
  constructor(
    public data: {
      revisionId: string;
      tableId: string;
      schema: Prisma.InputJsonValue;
    },
  ) {}
}

export type ApiCreateTableCommandData = ApiCreateTableCommand['data'];
