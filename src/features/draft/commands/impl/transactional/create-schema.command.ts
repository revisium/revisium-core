import { Prisma } from '@prisma/client';

export class CreateSchemaCommand {
  constructor(
    public readonly data: {
      data: Prisma.InputJsonValue;
      revisionId: string;
      tableId: string;
    },
  ) {}
}

export type CreateSchemaCommandReturnType = boolean;
