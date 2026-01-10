export class DeleteBranchCommand {
  constructor(
    public data: {
      organizationId: string;
      projectName: string;
      branchName: string;
    },
  ) {}
}

export type DeleteBranchCommandData = DeleteBranchCommand['data'];

export type DeleteBranchCommandReturnType = boolean;
