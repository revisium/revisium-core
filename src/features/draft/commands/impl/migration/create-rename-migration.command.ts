export class CreateRenameMigrationCommand {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
      readonly nextTableId: string;
    },
  ) {}
}

export type CreateRenameMigrationCommandData =
  CreateRenameMigrationCommand['data'];

export type CreateRenameMigrationCommandReturnType = boolean;
