import { Prisma } from '@prisma/client';

export class UpdateSchemaCommand {
  constructor(
    public readonly data: {
      data: Prisma.InputJsonValue;
      revisionId: string;
      tableId: string;
    },
  ) {}
}

export type UpdateSchemaCommandReturnType = boolean;
