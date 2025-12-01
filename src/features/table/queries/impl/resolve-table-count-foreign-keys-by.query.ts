export class ResolveTableCountForeignKeysByQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
    },
  ) {}
}

export type ResolveTableCountForeignKeysByQueryData =
  ResolveTableCountForeignKeysByQuery['data'];

export type ResolveTableCountForeignKeysByQueryReturnType = number;
