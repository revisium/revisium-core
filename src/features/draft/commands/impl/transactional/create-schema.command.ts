import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';

export class CreateSchemaCommand {
  constructor(
    public readonly data: {
      data: JsonSchema;
      revisionId: string;
      tableId: string;
      createdId: string;
    },
  ) {}
}

export type CreateSchemaCommandReturnType = boolean;
