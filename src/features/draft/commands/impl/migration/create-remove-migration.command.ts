export class CreateRemoveMigrationCommand {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
    },
  ) {}
}

export type CreateRemoveMigrationCommandData =
  CreateRemoveMigrationCommand['data'];

export type CreateRemoveMigrationCommandReturnType = boolean;
