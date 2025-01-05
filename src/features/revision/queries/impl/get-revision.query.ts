import { Revision } from '@prisma/client';

export class GetRevisionQuery {
  constructor(public data: { revisionId: string }) {}
}

export type GetRevisionQueryReturnType = Revision;
