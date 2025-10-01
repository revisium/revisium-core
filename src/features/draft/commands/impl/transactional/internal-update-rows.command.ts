import { Prisma } from '@prisma/client';
import { JsonSchema } from '@revisium/schema-toolkit/types';

export class InternalUpdateRowsCommand {
  constructor(
    public readonly data: {
      revisionId: string;
      tableId: string;
      tableSchema: JsonSchema;
      schemaHash: string;
      rows: {
        rowId: string;
        data: Prisma.InputJsonValue;
      }[];
    },
  ) {}
}
