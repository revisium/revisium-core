export class ResolveRowForeignKeysByQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
      readonly rowId: string;
      readonly foreignKeyByTableId: string;
      readonly first: number;
      readonly after?: string;
    },
  ) {}
}
