export class FindBranchInProjectOrThrowQuery {
  constructor(
    public readonly data: { projectId: string; branchName: string },
  ) {}
}
