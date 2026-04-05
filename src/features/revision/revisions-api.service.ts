import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  EngineApiService,
  GetChildrenByRevisionQueryData,
  GetMigrationsQueryData,
  GetRevisionQueryData,
  GetTablesByRevisionIdQueryData,
  ResolveBranchByRevisionQueryData,
  ResolveChildBranchesByRevisionQueryData,
  ResolveChildByRevisionQueryData,
  ResolveParentByRevisionQueryData,
} from '@revisium/engine';
import {
  GetEndpointsByRevisionIdQuery,
  GetEndpointsByRevisionIdQueryData,
} from 'src/features/revision/queries/impl';
import { RevisionCacheService } from 'src/infrastructure/cache/services/revision-cache.service';

@Injectable()
export class RevisionsApiService {
  constructor(
    private readonly engine: EngineApiService,
    private readonly queryBus: QueryBus,
    private readonly cache: RevisionCacheService,
  ) {}

  public revision(data: GetRevisionQueryData) {
    return this.cache.revision(data, () => this.engine.getRevision(data));
  }

  public migrations(data: GetMigrationsQueryData) {
    return this.engine.getMigrations(data);
  }

  public resolveParentByRevision(data: ResolveParentByRevisionQueryData) {
    return this.engine.getRevisionParent(data);
  }

  public resolveChildByRevision(data: ResolveChildByRevisionQueryData) {
    return this.engine.getRevisionChild(data);
  }

  public resolveChildBranchesByRevision(
    data: ResolveChildBranchesByRevisionQueryData,
  ) {
    return this.engine.resolveChildBranchesByRevision(data);
  }

  public getTablesByRevisionId(data: GetTablesByRevisionIdQueryData) {
    return this.engine.getTablesByRevisionId(data);
  }

  // Core-specific: endpoints not in engine
  public getEndpointsByRevisionId(data: GetEndpointsByRevisionIdQueryData) {
    return this.queryBus.execute(new GetEndpointsByRevisionIdQuery(data));
  }

  public getChildrenByRevision(data: GetChildrenByRevisionQueryData) {
    return this.engine.getRevisionChildren(data);
  }

  public resolveBranchByRevision(data: ResolveBranchByRevisionQueryData) {
    return this.engine.resolveBranchByRevision(data);
  }
}
