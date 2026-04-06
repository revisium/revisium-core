import { Injectable } from '@nestjs/common';
import { EngineApiService } from '@revisium/engine';

@Injectable()
export class BranchApiService {
  constructor(private readonly engine: EngineApiService) {}

  public getBranch(...args: Parameters<EngineApiService['getBranch']>) {
    return this.engine.getBranch(...args);
  }

  public getBranchById(...args: Parameters<EngineApiService['getBranchById']>) {
    return this.engine.getBranchById(...args);
  }

  public getBranches(...args: Parameters<EngineApiService['getBranches']>) {
    return this.engine.getBranches(...args);
  }

  public getHeadRevision(
    ...args: Parameters<EngineApiService['getHeadRevision']>
  ) {
    return this.engine.getHeadRevision(...args);
  }

  public getDraftRevision(
    ...args: Parameters<EngineApiService['getDraftRevision']>
  ) {
    return this.engine.getDraftRevision(...args);
  }

  public getStartRevision(
    ...args: Parameters<EngineApiService['getStartRevision']>
  ) {
    return this.engine.getStartRevision(...args);
  }

  public getTouchedByBranchId(
    ...args: Parameters<EngineApiService['getTouchedByBranchId']>
  ) {
    return this.engine.getTouchedByBranchId(...args);
  }

  public createBranch(...args: Parameters<EngineApiService['createBranch']>) {
    return this.engine.createBranch(...args);
  }

  public deleteBranch(...args: Parameters<EngineApiService['deleteBranch']>) {
    return this.engine.deleteBranch(...args);
  }

  public cleanOrphanedData() {
    return this.engine.cleanOrphanedData();
  }
}
