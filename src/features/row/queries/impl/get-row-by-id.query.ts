export class GetRowByIdQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
      readonly rowVersionId: string;
    },
  ) {}
}
