export class GetAllBranchesByProjectQuery {
  constructor(
    public data: {
      readonly projectId: string;
      readonly first: number;
      readonly after?: string;
    },
  ) {}
}
