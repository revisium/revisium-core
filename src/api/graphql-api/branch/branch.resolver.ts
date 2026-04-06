import { UseGuards } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { OptionalGqlJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { GQLProjectGuard } from 'src/features/auth/guards/project.guard';
import { ProjectApiService } from 'src/features/project/project-api.service';
import { BranchApiService } from 'src/features/branch/branch-api.service';
import { RevisionsApiService } from 'src/features/revision/revisions-api.service';
import {
  CreateBranchInput,
  DeleteBranchInput,
  GetBranchesInput,
  GetBranchInput,
  RevertChangesInput,
} from 'src/api/graphql-api/branch/inputs';
import { GetBranchRevisionsInput } from 'src/api/graphql-api/branch/inputs/get-branch-revisions.input';
import {
  BranchesConnection,
  BranchModel,
} from 'src/api/graphql-api/branch/model/branch.model';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver(() => BranchModel)
export class BranchResolver {
  constructor(
    private readonly projectApi: ProjectApiService,
    private readonly branchApi: BranchApiService,
    private readonly coreRevisions: RevisionsApiService,
  ) {}

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => BranchModel)
  async branch(@Args('data') data: GetBranchInput) {
    const projectId = await this.resolveProjectId(
      data.organizationId,
      data.projectName,
    );
    return this.branchApi.getBranch({
      projectId,
      branchName: data.branchName,
    });
  }

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => BranchesConnection)
  async branches(@Args('data') data: GetBranchesInput) {
    const projectId = await this.resolveProjectId(
      data.organizationId,
      data.projectName,
    );
    return this.branchApi.getBranches({
      projectId,
      first: data.first,
      after: data.after,
    });
  }

  @ResolveField()
  parent(@Parent() branch: BranchModel) {
    return this.branchApi.resolveParentBranch({ branchId: branch.id });
  }

  @ResolveField()
  project(@Parent() branch: BranchModel) {
    return this.branchApi.getProjectByBranch(branch.id);
  }

  @ResolveField()
  start(@Parent() branch: BranchModel) {
    return this.branchApi.getStartRevision(branch.id);
  }

  @ResolveField()
  head(@Parent() branch: BranchModel) {
    return this.branchApi.getHeadRevision(branch.id);
  }

  @ResolveField()
  draft(@Parent() branch: BranchModel) {
    return this.branchApi.getDraftRevision(branch.id);
  }

  @ResolveField()
  revisions(
    @Parent() branch: BranchModel,
    @Args('data') data: GetBranchRevisionsInput,
  ) {
    return this.coreRevisions.getRevisionsByBranchId({
      ...data,
      branchId: branch.id,
    });
  }

  @ResolveField()
  touched(@Parent() branch: BranchModel) {
    return this.branchApi.getTouchedByBranchId(branch.id);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Branch,
  })
  @Mutation(() => BranchModel)
  async createBranch(@Args('data') data: CreateBranchInput) {
    return this.branchApi.createBranch(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.revert,
    subject: PermissionSubject.Revision,
  })
  @Mutation(() => BranchModel)
  async revertChanges(@Args('data') data: RevertChangesInput) {
    const projectId = await this.resolveProjectId(
      data.organizationId,
      data.projectName,
    );
    return this.coreRevisions.revertChanges({
      projectId,
      branchName: data.branchName,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Branch,
  })
  @Mutation(() => Boolean)
  async deleteBranch(@Args('data') data: DeleteBranchInput) {
    const projectId = await this.resolveProjectId(
      data.organizationId,
      data.projectName,
    );
    return this.branchApi.deleteBranch({
      projectId,
      branchName: data.branchName,
    });
  }

  private async resolveProjectId(
    organizationId: string,
    projectName: string,
  ): Promise<string> {
    const project = await this.projectApi.getProject({
      organizationId,
      projectName,
    });
    return project.id;
  }
}
