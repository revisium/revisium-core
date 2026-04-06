import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { RevisionCacheService } from 'src/infrastructure/cache/services/revision-cache.service';
import { CreateRevisionCommand, RevertChangesCommand } from './commands/impl';

@Injectable()
export class RevisionApiService {
  constructor(
    private readonly engine: EngineApiService,
    private readonly commandBus: CommandBus,
    private readonly revisionCache: RevisionCacheService,
  ) {}

  // ---- Cached reads ----

  public getRevision(data: Parameters<EngineApiService['getRevision']>[0]) {
    return this.revisionCache.revision(data, () =>
      this.engine.getRevision(data),
    );
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
