import { GetEndpointsByRevisionId } from 'src/features/revision/queries/types/get-endpoints-by-revision-id';

export class GetEndpointsByRevisionIdQuery {
  constructor(public revisionId: string) {}
}

export type GetEndpointsByRevisionIdQueryData =
  GetEndpointsByRevisionIdQuery['revisionId'];

export type GetEndpointsByRevisionIdQueryReturnType = GetEndpointsByRevisionId;
