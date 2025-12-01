export class ResolveParentBranchByBranchQuery {
  constructor(public readonly data: { readonly branchId: string }) {}
}

export type ResolveParentBranchByBranchQueryData =
  ResolveParentBranchByBranchQuery['data'];
