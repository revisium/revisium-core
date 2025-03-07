export class ResolveTableCountForeignKeysByQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
    },
  ) {}
}
