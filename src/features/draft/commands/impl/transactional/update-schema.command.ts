import { Prisma } from '@prisma/client';
import { JsonPatch } from 'src/features/share/utils/schema/types/json-patch.types';

export class UpdateSchemaCommand {
  constructor(
    public readonly data: {
      schema: Prisma.InputJsonValue;
      patches: JsonPatch[];
      revisionId: string;
      tableId: string;
    },
  ) {}
}

export type UpdateSchemaCommandReturnType = boolean;
