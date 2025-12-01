import { Injectable } from '@nestjs/common';
import { InternalRevisionsApiService } from 'src/features/revision/internal-revisions-api.service';
import {
  GetChildrenByRevisionQueryData,
  GetEndpointsByRevisionIdQueryData,
  GetMigrationsQueryData,
  GetRevisionQueryData,
  GetTablesByRevisionIdQueryData,
  ResolveBranchByRevisionQueryData,
  ResolveChildBranchesByRevisionQueryData,
  ResolveChildByRevisionQueryData,
  ResolveParentByRevisionQueryData,
} from 'src/features/revision/queries/impl';
import { RevisionCacheService } from 'src/infrastructure/cache/services/revision-cache.service';

@Injectable()
export class RevisionsApiService {
  constructor(
    private readonly api: InternalRevisionsApiService,
    private readonly cache: RevisionCacheService,
  ) {}

  public revision(data: GetRevisionQueryData) {
    return this.cache.revision(data, () => this.api.revision(data));
  }

  public migrations(data: GetMigrationsQueryData) {
    return this.api.migrations(data);
  }

  public resolveParentByRevision(data: ResolveParentByRevisionQueryData) {
    return this.api.resolveParentByRevision(data);
  }

  public resolveChildByRevision(data: ResolveChildByRevisionQueryData) {
    return this.api.resolveChildByRevision(data);
  }

  public resolveChildBranchesByRevision(
    data: ResolveChildBranchesByRevisionQueryData,
  ) {
    return this.api.resolveChildBranchesByRevision(data);
  }

  public getTablesByRevisionId(data: GetTablesByRevisionIdQueryData) {
    return this.api.getTablesByRevisionId(data);
  }

  public getEndpointsByRevisionId(data: GetEndpointsByRevisionIdQueryData) {
    return this.api.getEndpointsByRevisionId(data);
  }

  public getChildrenByRevision(data: GetChildrenByRevisionQueryData) {
    return this.api.getChildrenByRevision(data);
  }

  public resolveBranchByRevision(data: ResolveBranchByRevisionQueryData) {
    return this.api.resolveBranchByRevision(data);
  }
}
