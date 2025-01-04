export class ApiCreateBranchByRevisionIdCommand {
  constructor(public data: { revisionId: string; branchName: string }) {}
}
