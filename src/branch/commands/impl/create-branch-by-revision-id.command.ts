export class CreateBranchByRevisionIdCommand {
  constructor(public data: { revisionId: string; branchName: string }) {}
}
