import { Revision } from '@prisma/client';

export class GetRevisionQuery {
  constructor(public data: { revisionId: string }) {}
}

export type GetRevisionQueryData = GetRevisionQuery['data'];

export type GetRevisionQueryReturnType = Revision;
