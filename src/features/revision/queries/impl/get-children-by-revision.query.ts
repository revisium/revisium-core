import { Revision } from 'src/__generated__/client';

export class GetChildrenByRevisionQuery {
  constructor(public revisionId: string) {}
}

export type GetChildrenByRevisionQueryData = string;

export type GetChildrenByRevisionQueryReturnType = Revision[];
