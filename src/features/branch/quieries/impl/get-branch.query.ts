export class GetBranchQuery {
  constructor(
    public data: {
      readonly organizationId: string;
      readonly projectName: string;
      readonly branchName: string;
    },
  ) {}
}
