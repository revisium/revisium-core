import { Branch } from 'src/__generated__/client';

export class GetRootBranchByProjectQuery {
  constructor(public projectId: string) {}
}

export type GetRootBranchByProjectQueryData =
  GetRootBranchByProjectQuery['projectId'];

export type GetRootBranchByProjectQueryReturnType = Branch;
