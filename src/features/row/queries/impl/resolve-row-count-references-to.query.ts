export class ResolveRowCountReferencesToQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
      readonly rowId: string;
    },
  ) {}
}
