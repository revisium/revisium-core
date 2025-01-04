export class GetRevisionsByBranchIdQuery {
  constructor(
    public data: {
      readonly branchId: string;
      readonly first: number;
      readonly after?: string;
      readonly before?: string;
      readonly comment?: string;
    },
  ) {}
}
