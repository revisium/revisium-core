import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  GetEndpointsByRevisionIdQuery,
  GetEndpointsByRevisionIdQueryData,
  ResolveBranchByRevisionQuery,
  ResolveBranchByRevisionQueryData,
  ResolveChildBranchesByRevisionQuery,
  ResolveChildBranchesByRevisionQueryData,
} from 'src/features/revision/queries/impl';

@Injectable()
export class InternalRevisionsApiService {
  constructor(private readonly queryBus: QueryBus) {}

  public resolveChildBranchesByRevision(
    data: ResolveChildBranchesByRevisionQueryData,
  ) {
    return this.queryBus.execute(new ResolveChildBranchesByRevisionQuery(data));
  }

  public getEndpointsByRevisionId(data: GetEndpointsByRevisionIdQueryData) {
    return this.queryBus.execute(new GetEndpointsByRevisionIdQuery(data));
  }

  public resolveBranchByRevision(data: ResolveBranchByRevisionQueryData) {
    return this.queryBus.execute(new ResolveBranchByRevisionQuery(data));
  }
}
