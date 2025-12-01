export class ResolveChildBranchesByRevisionQuery {
  constructor(public revisionId: string) {}
}

export type ResolveChildBranchesByRevisionQueryData =
  ResolveChildBranchesByRevisionQuery['revisionId'];

export type ResolveChildBranchesByRevisionQueryReturnType = {
  branch: { id: string };
  revision: { id: string };
}[];
