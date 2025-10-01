import { JsonSchema } from '@revisium/schema-toolkit/types';

export class CreateSchemaCommand {
  constructor(
    public readonly data: {
      data: JsonSchema;
      revisionId: string;
      tableId: string;
    },
  ) {}
}

export type CreateSchemaCommandReturnType = boolean;
