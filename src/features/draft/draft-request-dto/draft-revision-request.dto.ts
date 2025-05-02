import { Injectable } from '@nestjs/common';
import {
  DraftContextKeys,
  DraftContextService,
} from 'src/features/draft/draft-context.service';

@Injectable()
export class DraftRevisionRequestDto {
  constructor(private readonly draftContext: DraftContextService) {}

  public get organizationId(): string {
    return this.draftContext.resolveKey(DraftContextKeys.OrganizationId);
  }

  public set organizationId(value: string) {
    this.draftContext.setKey(DraftContextKeys.OrganizationId, value);
  }

  public get hasOrganizationId(): boolean {
    return this.draftContext.hasKey(DraftContextKeys.OrganizationId);
  }

  public get projectId(): string {
    return this.draftContext.resolveKey(DraftContextKeys.ProjectId);
  }

  public set projectId(value: string) {
    this.draftContext.setKey(DraftContextKeys.ProjectId, value);
  }

  public get hasProjectId(): boolean {
    return this.draftContext.hasKey(DraftContextKeys.ProjectId);
  }

  public get branchId(): string {
    return this.draftContext.resolveKey(DraftContextKeys.BranchId);
  }

  public set branchId(value: string) {
    this.draftContext.setKey(DraftContextKeys.BranchId, value);
  }

  public get hasBranchId(): boolean {
    return this.draftContext.hasKey(DraftContextKeys.BranchId);
  }

  public get id(): string {
    return this.draftContext.resolveKey(DraftContextKeys.DraftRevisionId);
  }

  public set id(value: string) {
    this.draftContext.setKey(DraftContextKeys.DraftRevisionId, value);
  }

  public get hasId(): boolean {
    return this.draftContext.hasKey(DraftContextKeys.DraftRevisionId);
  }

  public get parentId(): string {
    return this.draftContext.resolveKey(DraftContextKeys.DraftParentRevisionId);
  }

  public set parentId(value: string) {
    this.draftContext.setKey(DraftContextKeys.DraftParentRevisionId, value);
  }

  public get hasParentId(): boolean {
    return this.draftContext.hasKey(DraftContextKeys.DraftParentRevisionId);
  }
}
