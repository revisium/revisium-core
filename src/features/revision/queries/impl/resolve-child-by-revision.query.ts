import { Revision } from 'src/__generated__/client';

export class ResolveChildByRevisionQuery {
  constructor(public revisionId: string) {}
}

export type ResolveChildByRevisionQueryData =
  ResolveChildByRevisionQuery['revisionId'];

export type ResolveChildByRevisionQueryReturnType = Revision | null;
