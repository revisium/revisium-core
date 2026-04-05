import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import {
  GetBranchByIdQueryData,
  GetBranchesQuery,
  GetBranchesQueryData,
  GetBranchesQueryReturnType,
  GetBranchQuery,
  GetBranchQueryData,
  GetProjectByBranchQuery,
  GetRevisionsByBranchIdQueryData,
  GetRevisionsByBranchIdQueryReturnType,
  ResolveParentBranchByBranchQuery,
  ResolveParentBranchByBranchQueryData,
} from 'src/features/branch/quieries/impl';
import {
  GetBranchReturnType,
  GetDraftRevisionTypes,
  GetHeadRevisionReturnType,
  GetStartRevisionReturnType,
} from 'src/features/branch/quieries/types';
import { GetBranchByIdReturnType } from 'src/features/branch/quieries/types/get-branch-by-id.types';

@Injectable()
export class BranchApiService {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly engine: EngineApiService,
  ) {}

  // Core-specific: takes org/project/branch, engine needs projectId
  public getBranch(data: GetBranchQueryData): Promise<GetBranchReturnType> {
    return this.queryBus.execute(new GetBranchQuery(data));
  }

  // Core-specific: takes org/project, engine needs projectId
  public getBranches(
    data: GetBranchesQueryData,
  ): Promise<GetBranchesQueryReturnType> {
    return this.queryBus.execute(new GetBranchesQuery(data));
  }

  // Core-specific: not in engine
  public resolveParentBranch(data: ResolveParentBranchByBranchQueryData) {
    return this.queryBus.execute(new ResolveParentBranchByBranchQuery(data));
  }

  // Core-specific: not in engine
  public getProjectByBranch(branchId: string) {
    return this.queryBus.execute(new GetProjectByBranchQuery(branchId));
  }

  // Engine delegates
  public getStartRevision(
    branchId: string,
  ): Promise<GetStartRevisionReturnType> {
    return this.engine.getStartRevision(
      branchId,
    ) as Promise<GetStartRevisionReturnType>;
  }

  public getHeadRevision(branchId: string): Promise<GetHeadRevisionReturnType> {
    return this.engine.getHeadRevision(
      branchId,
    ) as Promise<GetHeadRevisionReturnType>;
  }

  public getDraftRevision(branchId: string): Promise<GetDraftRevisionTypes> {
    return this.engine.getDraftRevision(
      branchId,
    ) as Promise<GetDraftRevisionTypes>;
  }

  public getRevisionsByBranchId(
    data: GetRevisionsByBranchIdQueryData,
  ): Promise<GetRevisionsByBranchIdQueryReturnType> {
    return this.engine.getRevisionsByBranchId(data);
  }

  public getTouchedByBranchId(branchId: string): Promise<boolean> {
    return this.engine.getTouchedByBranchId(branchId);
  }

  public apiCreateBranchByRevisionId(data: {
    revisionId: string;
    branchName: string;
  }): Promise<GetBranchByIdReturnType> {
    return this.engine.createBranch(data) as Promise<GetBranchByIdReturnType>;
  }

  public getBranchById(
    data: GetBranchByIdQueryData,
  ): Promise<GetBranchByIdReturnType> {
    return this.engine.getBranchById(data) as Promise<GetBranchByIdReturnType>;
  }

  public deleteBranch(data: { projectId: string; branchName: string }) {
    return this.engine.deleteBranch(data);
  }
}
