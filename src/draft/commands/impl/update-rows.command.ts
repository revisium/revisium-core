import { Prisma } from '@prisma/client';
import { JsonSchema } from 'src/share/utils/schema/types/schema.types';

export class UpdateRowsCommand {
  constructor(
    public readonly data: {
      revisionId: string;
      tableId: string;
      tableSchema: JsonSchema;
      rows: {
        rowId: string;
        data: Prisma.InputJsonValue;
      }[];
    },
  ) {}
}
