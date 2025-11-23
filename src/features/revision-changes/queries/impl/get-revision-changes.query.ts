import { RevisionChanges } from '../../types';

export class GetRevisionChangesQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly compareWithRevisionId?: string;
      readonly includeSystem?: boolean;
    },
  ) {}
}

export type GetRevisionChangesQueryData = GetRevisionChangesQuery['data'];

export type GetRevisionChangesQueryReturnType = RevisionChanges;
