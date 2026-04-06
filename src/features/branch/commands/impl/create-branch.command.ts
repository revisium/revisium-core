import { EngineApiService } from '@revisium/engine';

export type CreateBranchData = Parameters<EngineApiService['createBranch']>[0];

export class CreateBranchCommand {
  constructor(public readonly data: CreateBranchData) {}
}
