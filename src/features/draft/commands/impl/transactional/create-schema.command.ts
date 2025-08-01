import { Prisma } from '@prisma/client';

export class CreateSchemaCommand {
  constructor(
    public readonly data: {
      data: Prisma.InputJsonValue;
      revisionId: string;
      tableId: string;
      createdId: string;
    },
  ) {}
}

export type CreateSchemaCommandReturnType = boolean;
