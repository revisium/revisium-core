import { Revision } from 'src/__generated__/client';

export class ResolveParentByRevisionQuery {
  constructor(public revisionId: string) {}
}

export type ResolveParentByRevisionQueryData =
  ResolveParentByRevisionQuery['revisionId'];

export type ResolveParentByRevisionQueryReturnType = Revision | null;
