export class GetTablesQuery {
  constructor(
    public data: {
      readonly revisionId: string;
      readonly first: number;
      readonly after?: string;
    },
  ) {}
}
