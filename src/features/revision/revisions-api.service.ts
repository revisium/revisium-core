import { Injectable } from '@nestjs/common';
import {
  EngineApiService,
  GetChildrenByRevisionQueryData,
  GetMigrationsQueryData,
  GetRevisionQueryData,
  GetTablesByRevisionIdQueryData,
  ResolveChildByRevisionQueryData,
  ResolveParentByRevisionQueryData,
} from '@revisium/engine';
import { InternalRevisionsApiService } from 'src/features/revision/internal-revisions-api.service';
import {
  GetEndpointsByRevisionIdQueryData,
  ResolveBranchByRevisionQueryData,
  ResolveChildBranchesByRevisionQueryData,
} from 'src/features/revision/queries/impl';
import { RevisionCacheService } from 'src/infrastructure/cache/services/revision-cache.service';

@Injectable()
export class RevisionsApiService {
  constructor(
    private readonly engine: EngineApiService,
    private readonly api: InternalRevisionsApiService,
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

  // Core-specific: not in engine
  public resolveChildBranchesByRevision(
    data: ResolveChildBranchesByRevisionQueryData,
  ) {
    return this.api.resolveChildBranchesByRevision(data);
  }

  public getTablesByRevisionId(data: GetTablesByRevisionIdQueryData) {
    return this.engine.getTablesByRevisionId(data);
  }

  // Core-specific: not in engine
  public getEndpointsByRevisionId(data: GetEndpointsByRevisionIdQueryData) {
    return this.api.getEndpointsByRevisionId(data);
  }

  public getChildrenByRevision(data: GetChildrenByRevisionQueryData) {
    return this.engine.getRevisionChildren(data);
  }

  // Core-specific: not in engine
  public resolveBranchByRevision(data: ResolveBranchByRevisionQueryData) {
    return this.api.resolveBranchByRevision(data);
  }
}
