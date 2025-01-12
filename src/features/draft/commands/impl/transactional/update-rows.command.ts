import { Prisma } from '@prisma/client';
import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';

export class UpdateRowsCommand {
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
