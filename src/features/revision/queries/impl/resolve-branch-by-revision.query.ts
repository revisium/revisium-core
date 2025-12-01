import { Branch } from 'src/__generated__/client';

export class ResolveBranchByRevisionQuery {
  constructor(public revisionId: string) {}
}

export type ResolveBranchByRevisionQueryData = string;

export type ResolveBranchByRevisionQueryReturnType = Branch;
