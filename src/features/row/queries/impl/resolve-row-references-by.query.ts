export class ResolveRowReferencesByQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
      readonly rowId: string;
      readonly referenceByTableId: string;
      readonly first: number;
      readonly after?: string;
    },
  ) {}
}
