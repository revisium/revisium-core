export class GetTableByIdQuery {
  constructor(
    public readonly data: {
      readonly revisionId?: string;
      readonly tableVersionId: string;
    },
  ) {}
}
