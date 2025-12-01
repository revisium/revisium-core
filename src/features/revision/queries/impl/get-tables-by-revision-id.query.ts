import { GetRevisionTablesReturnType } from 'src/features/revision/queries/types';

export class GetTablesByRevisionIdQuery {
  constructor(
    public data: {
      readonly revisionId: string;
      readonly first: number;
      readonly after?: string;
    },
  ) {}
}

export type GetTablesByRevisionIdQueryData = GetTablesByRevisionIdQuery['data'];

export type GetTablesByRevisionIdQueryReturnType = GetRevisionTablesReturnType;
