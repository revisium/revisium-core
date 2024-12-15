export class GetTablesByRevisionIdQuery {
  constructor(
    public data: {
      readonly revisionId: string;
      readonly first: number;
      readonly after?: string;
    },
  ) {}
}
