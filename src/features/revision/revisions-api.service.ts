import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import {
  GetEndpointsByRevisionIdQuery,
  GetEndpointsByRevisionIdQueryData,
} from 'src/features/revision/queries/impl/get-endpoints-by-revision-id.query';
import { RevisionCacheService } from 'src/infrastructure/cache/services/revision-cache.service';
import { CreateRevisionCommand } from './commands/impl/create-revision.command';
import { RevertChangesCommand } from './commands/impl/revert-changes.command';

@Injectable()
export class RevisionsApiService {
  constructor(
    private readonly engine: EngineApiService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly cache: RevisionCacheService,
  ) {}

  // ---- Cached reads ----

  public getRevision(data: Parameters<EngineApiService['getRevision']>[0]) {
    return this.cache.revision(data, () => this.engine.getRevision(data));
  }

  // ---- Passthrough reads ----

  public getRevisionParent(
    ...args: Parameters<EngineApiService['getRevisionParent']>
  ) {
    return this.engine.getRevisionParent(...args);
  }

  public getRevisionChild(
    ...args: Parameters<EngineApiService['getRevisionChild']>
  ) {
    return this.engine.getRevisionChild(...args);
  }

  public getRevisionChildren(
    ...args: Parameters<EngineApiService['getRevisionChildren']>
  ) {
    return this.engine.getRevisionChildren(...args);
  }

  public getRevisionsByBranchId(
    ...args: Parameters<EngineApiService['getRevisionsByBranchId']>
  ) {
    return this.engine.getRevisionsByBranchId(...args);
  }

  public revisionChanges(
    ...args: Parameters<EngineApiService['revisionChanges']>
  ) {
    return this.engine.revisionChanges(...args);
  }

  // ---- Feature-specific reads ----

  public resolveChildBranchesByRevision(
    ...args: Parameters<EngineApiService['resolveChildBranchesByRevision']>
  ) {
    return this.engine.resolveChildBranchesByRevision(...args);
  }

  public resolveBranchByRevision(
    ...args: Parameters<EngineApiService['resolveBranchByRevision']>
  ) {
    return this.engine.resolveBranchByRevision(...args);
  }

  public getEndpointsByRevisionId(data: GetEndpointsByRevisionIdQueryData) {
    return this.queryBus.execute(new GetEndpointsByRevisionIdQuery(data));
  }

  // ---- Commands ----

  public createRevision(
    data: Parameters<EngineApiService['createRevision']>[0],
  ) {
    return this.commandBus.execute(new CreateRevisionCommand(data));
  }

  public revertChanges(data: Parameters<EngineApiService['revertChanges']>[0]) {
    return this.commandBus.execute(new RevertChangesCommand(data));
  }
}
