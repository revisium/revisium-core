import { UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
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
import { ApiCreateBranchByRevisionIdCommand } from 'src/features/branch/commands/impl';
import {
  GetDraftRevisionQuery,
  GetHeadRevisionQuery,
  GetProjectByBranchQuery,
  GetStartRevisionQuery,
  GetTouchedByBranchIdQuery,
  ResolveParentBranchByBranchQuery,
} from 'src/features/branch/quieries/impl';
import { GetBranchQuery } from 'src/features/branch/quieries/impl/get-branch.query';
import { GetBranchesQuery } from 'src/features/branch/quieries/impl/get-branches.query';
import { GetRevisionsByBranchIdQuery } from 'src/features/branch/quieries/impl/get-revisions-by-branch-id.query';
import { ApiRevertChangesCommand } from 'src/features/draft/commands/impl/api-revert-changes.command';
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
  constructor(
    private queryBus: QueryBus,
    private commandBus: CommandBus,
  ) {}

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => BranchModel)
  branch(@Args('data') data: GetBranchInput) {
    return this.queryBus.execute(new GetBranchQuery(data));
  }

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => BranchesConnection)
  branches(@Args('data') data: GetBranchesInput) {
    return this.queryBus.execute(new GetBranchesQuery(data));
  }

  @ResolveField()
  parent(@Parent() branch: BranchModel) {
    return this.queryBus.execute(
      new ResolveParentBranchByBranchQuery({ branchId: branch.id }),
    );
  }

  @ResolveField()
  project(@Parent() branch: BranchModel) {
    return this.queryBus.execute(new GetProjectByBranchQuery(branch.id));
  }

  @ResolveField()
  start(@Parent() branch: BranchModel) {
    return this.queryBus.execute(new GetStartRevisionQuery(branch.id));
  }

  @ResolveField()
  head(@Parent() branch: BranchModel) {
    return this.queryBus.execute(new GetHeadRevisionQuery(branch.id));
  }

  @ResolveField()
  draft(@Parent() branch: BranchModel) {
    return this.queryBus.execute(new GetDraftRevisionQuery(branch.id));
  }

  @ResolveField()
  revisions(
    @Parent() branch: BranchModel,
    @Args('data') data: GetBranchRevisionsInput,
  ) {
    return this.queryBus.execute(
      new GetRevisionsByBranchIdQuery({ branchId: branch.id, ...data }),
    );
  }

  @ResolveField()
  touched(@Parent() branch: BranchModel) {
    return this.queryBus.execute(new GetTouchedByBranchIdQuery(branch.id));
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
    return this.commandBus.execute(
      new ApiCreateBranchByRevisionIdCommand(data),
    );
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.revert,
    subject: PermissionSubject.Revision,
  })
  @Mutation(() => BranchModel)
  revertChanges(@Args('data') data: RevertChangesInput) {
    return this.commandBus.execute(new ApiRevertChangesCommand(data));
  }
}
