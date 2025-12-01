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
import { BranchApiService } from 'src/features/branch/branch-api.service';
import { GetBranchesInput } from 'src/api/graphql-api/branch/inputs';
import { CreateBranchByRevisionIdInput } from 'src/api/graphql-api/branch/inputs/create-branch-by-revision-id.input';
import { GetBranchRevisionsInput } from 'src/api/graphql-api/branch/inputs/get-branch-revisions.input';
import { GetBranchInput } from 'src/api/graphql-api/branch/inputs/get-branch.input';
import { RevertChangesInput } from 'src/api/graphql-api/branch/inputs/revert-changes.input';
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
  constructor(private readonly branchApiService: BranchApiService) {}

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => BranchModel)
  branch(@Args('data') data: GetBranchInput) {
    return this.branchApiService.getBranch(data);
  }

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => BranchesConnection)
  branches(@Args('data') data: GetBranchesInput) {
    return this.branchApiService.getBranches(data);
  }

  @ResolveField()
  parent(@Parent() branch: BranchModel) {
    return this.branchApiService.resolveParentBranch({ branchId: branch.id });
  }

  @ResolveField()
  project(@Parent() branch: BranchModel) {
    return this.branchApiService.getProjectByBranch(branch.id);
  }

  @ResolveField()
  start(@Parent() branch: BranchModel) {
    return this.branchApiService.getStartRevision(branch.id);
  }

  @ResolveField()
  head(@Parent() branch: BranchModel) {
    return this.branchApiService.getHeadRevision(branch.id);
  }

  @ResolveField()
  draft(@Parent() branch: BranchModel) {
    return this.branchApiService.getDraftRevision(branch.id);
  }

  @ResolveField()
  revisions(
    @Parent() branch: BranchModel,
    @Args('data') data: GetBranchRevisionsInput,
  ) {
    return this.branchApiService.getRevisionsByBranchId({
      ...data,
      branchId: branch.id,
    });
  }

  @ResolveField()
  touched(@Parent() branch: BranchModel) {
    return this.branchApiService.getTouchedByBranchId(branch.id);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Branch,
  })
  @Mutation(() => BranchModel)
  async createBranchByRevisionId(
    @Args('data') data: CreateBranchByRevisionIdInput,
  ) {
    return this.branchApiService.apiCreateBranchByRevisionId(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.revert,
    subject: PermissionSubject.Revision,
  })
  @Mutation(() => BranchModel)
  revertChanges(@Args('data') data: RevertChangesInput) {
    return this.branchApiService.apiRevertChanges(data);
  }
}
