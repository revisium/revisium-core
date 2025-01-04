export class GetBranchesQuery {
  constructor(
    public data: {
      readonly organizationId: string;
      readonly projectName: string;
      readonly first: number;
      readonly after?: string;
    },
  ) {}
}
