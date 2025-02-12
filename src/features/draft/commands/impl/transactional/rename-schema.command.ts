export class RenameSchemaCommand {
  constructor(
    public readonly data: {
      revisionId: string;
      tableId: string;
      nextTableId: string;
    },
  ) {}
}

export type RenameSchemaCommandReturnType = boolean;
