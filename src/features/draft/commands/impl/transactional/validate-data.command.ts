import { Prisma } from '@prisma/client';
import { JsonSchema } from '@revisium/schema-toolkit/types';

export class ValidateDataCommand {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
      readonly tableSchema?: JsonSchema;
      readonly rows: { rowId: string; data: Prisma.InputJsonValue }[];
    },
  ) {}
}

export type ValidateDataCommandReturnType = { schemaHash: string };
