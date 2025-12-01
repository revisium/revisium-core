import { GetEndpointsByRevisionId } from 'src/features/revision/queries/types';

export class GetEndpointsByRevisionIdQuery {
  constructor(public revisionId: string) {}
}

export type GetEndpointsByRevisionIdQueryData =
  GetEndpointsByRevisionIdQuery['revisionId'];

export type GetEndpointsByRevisionIdQueryReturnType = GetEndpointsByRevisionId;
