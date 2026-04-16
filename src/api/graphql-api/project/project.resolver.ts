import { Inject, UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { CurrentUser } from 'src/api/graphql-api/current-user.decorator';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { OptionalGqlJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { GQLProjectGuard } from 'src/features/auth/guards/project.guard';
import {
  AddUserToProjectInput,
  DeleteProjectInput,
  GetProjectInput,
  GetUsersProjectInput,
  RemoveUserFromProjectInput,
  UpdateProjectInput,
  UpdateUserProjectRoleInput,
} from 'src/api/graphql-api/project/inputs';
import { GetProjectBranchesInput } from 'src/api/graphql-api/project/inputs/get-project-branches.input';
import { UsageMetricModel } from 'src/api/graphql-api/billing/models/usage.model';
import { ProjectModel } from 'src/api/graphql-api/project/model';
import { UsersProjectConnection } from 'src/api/graphql-api/project/model/users-project.connection';
import { IOptionalAuthUser } from 'src/features/auth/types';
import { OrganizationApiService } from 'src/features/organization/organization-api.service';
import { ProjectApiService } from 'src/features/project/project-api.service';
import { UserApiService } from 'src/features/user/user-api.service';
import {
  BILLING_GRAPHQL_SERVICE_TOKEN,
  IBillingGraphqlService,
} from 'src/features/billing/billing-graphql.interface';

type ProjectResolverContext = {
  endpointUsageLimitByOrg?: Map<string, Promise<number | null | undefined>>;
};

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver(() => ProjectModel)
export class ProjectResolver {
  constructor(
    private readonly projectApi: ProjectApiService,
    private readonly organizationApi: OrganizationApiService,
    private readonly userApi: UserApiService,
    @Inject(BILLING_GRAPHQL_SERVICE_TOKEN)
    private readonly billingService: IBillingGraphqlService,
  ) {}

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => ProjectModel)
  project(@Args('data') data: GetProjectInput) {
    return this.projectApi.getProject(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.read,
    subject: PermissionSubject.User,
  })
  @Query(() => UsersProjectConnection)
  usersProject(@Args('data') data: GetUsersProjectInput) {
    return this.projectApi.getUsersProject({ ...data });
  }

  @ResolveField()
  rootBranch(@Parent() data: ProjectModel) {
    return this.projectApi.getRootBranchByProject(data.id);
  }

  @ResolveField()
  allBranches(
    @Parent() parent: ProjectModel,
    @Args('data') data: GetProjectBranchesInput,
  ) {
    return this.projectApi.getAllBranchesByProject({
      ...data,
      projectId: parent.id,
    });
  }

  @ResolveField()
  organization(@Parent() parent: ProjectModel) {
    return this.organizationApi.organization({
      organizationId: parent.organizationId,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Project,
  })
  @Mutation(() => Boolean)
  updateProject(@Args('data') data: UpdateProjectInput) {
    return this.projectApi.updateProject(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Project,
  })
  @Mutation(() => Boolean)
  deleteProject(@Args('data') data: DeleteProjectInput) {
    return this.projectApi.deleteProject(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.add,
    subject: PermissionSubject.User,
  })
  @Mutation(() => Boolean)
  addUserToProject(@Args('data') data: AddUserToProjectInput) {
    return this.projectApi.addUserToProject(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.User,
  })
  @Mutation(() => Boolean)
  removeUserFromProject(@Args('data') data: RemoveUserFromProjectInput) {
    return this.projectApi.removeUserFromProject(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.User,
  })
  @Mutation(() => Boolean)
  updateUserProjectRole(@Args('data') data: UpdateUserProjectRoleInput) {
    return this.projectApi.updateUserProjectRole(data);
  }

  @ResolveField()
  userProject(
    @Parent() parent: ProjectModel,
    @CurrentUser() user: IOptionalAuthUser,
  ) {
    if (!user) {
      return null;
    }
    return this.userApi.userProject({
      projectId: parent.id,
      userId: user.userId,
    });
  }

  @ResolveField(() => UsageMetricModel, { nullable: true })
  async endpointUsage(
    @Parent() parent: ProjectModel,
    @Context() ctx: ProjectResolverContext,
  ) {
    const endpointLimit = await this.getEndpointUsageLimitForOrganization(
      parent.organizationId,
      ctx,
    );

    if (endpointLimit === undefined) {
      return null;
    }

    return this.billingService.getProjectEndpointUsage(
      parent.organizationId,
      parent.id,
      { endpointLimit },
    );
  }

  private getEndpointUsageLimitForOrganization(
    organizationId: string,
    ctx: ProjectResolverContext,
  ) {
    ctx.endpointUsageLimitByOrg ??= new Map();

    const existing = ctx.endpointUsageLimitByOrg.get(organizationId);
    if (existing) {
      return existing;
    }

    const limitPromise =
      this.billingService.getProjectEndpointLimit(organizationId);
    ctx.endpointUsageLimitByOrg.set(organizationId, limitPromise);

    return limitPromise;
  }
}
