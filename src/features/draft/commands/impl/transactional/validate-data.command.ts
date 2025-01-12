import { Prisma } from '@prisma/client';
import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';

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
