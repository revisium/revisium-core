export class ResolveRowCountReferencesByQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
      readonly rowId: string;
    },
  ) {}
}
