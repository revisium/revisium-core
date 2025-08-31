export class ResolveRowCountForeignKeysByQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
      readonly rowId: string;
    },
  ) {}
}

export type ResolveRowCountForeignKeysByQueryData =
  ResolveRowCountForeignKeysByQuery['data'];

export type ResolveRowCountForeignKeysByQueryReturnType = number;
