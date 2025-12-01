import { UseGuards } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { OrganizationModel } from 'src/api/graphql-api/organization/model/organization.model';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { OptionalGqlJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-gql-jwt-auth-guard.service';
import { GQLOrganizationGuard } from 'src/features/auth/guards/organization.guard';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { IAuthUser, IOptionalAuthUser } from 'src/features/auth/types';
import { CurrentUser } from 'src/api/graphql-api/current-user.decorator';
import {
  AddUserToOrganizationInput,
  GetUsersOrganizationInput,
  RemoveUserFromOrganizationInput,
} from 'src/api/graphql-api/organization/inputs';
import { UsersOrganizationConnection } from 'src/api/graphql-api/organization/model/users-organization.connection';
import { CreateProjectInput } from 'src/api/graphql-api/project/inputs';
import { GetProjectsInput } from 'src/api/graphql-api/project/inputs/get-projects.input';
import { ProjectModel } from 'src/api/graphql-api/project/model';
import { ProjectsConnection } from 'src/api/graphql-api/project/model/projects.connection';
import { OrganizationApiService } from 'src/features/organization/organization-api.service';
import { ProjectApiService } from 'src/features/project/project-api.service';
import { UserApiService } from 'src/features/user/user-api.service';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Organization,
})
@Resolver(() => OrganizationModel)
export class OrganizationResolver {
  constructor(
    private readonly organizationApi: OrganizationApiService,
    private readonly projectApi: ProjectApiService,
    private readonly userApi: UserApiService,
  ) {}

  @UseGuards(OptionalGqlJwtAuthGuard, GQLOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.read,
    subject: PermissionSubject.Organization,
  })
  @Query(() => ProjectsConnection)
  projects(
    @Args('data') data: GetProjectsInput,
    @CurrentUser() user: IOptionalAuthUser,
  ) {
    return this.organizationApi.getProjectsByOrganizationId({
      ...data,
      userId: user?.userId,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GQLOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.read,
    subject: PermissionSubject.User,
  })
  @Query(() => UsersOrganizationConnection)
  usersOrganization(@Args('data') data: GetUsersOrganizationInput) {
    return this.organizationApi.getUsersOrganization({ ...data });
  }

  @UseGuards(GqlJwtAuthGuard, GQLOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Project,
  })
  @Mutation(() => ProjectModel)
  createProject(@Args('data') data: CreateProjectInput) {
    return this.projectApi.apiCreateProject(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.add,
    subject: PermissionSubject.User,
  })
  @Mutation(() => Boolean)
  addUserToOrganization(@Args('data') data: AddUserToOrganizationInput) {
    return this.organizationApi.addUserToOrganization(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.User,
  })
  @Mutation(() => Boolean)
  removeUserFromOrganization(
    @Args('data') data: RemoveUserFromOrganizationInput,
  ) {
    return this.organizationApi.removeUserFromOrganization(data);
  }

  @ResolveField()
  userOrganization(
    @Parent() parent: OrganizationModel,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.userApi.userOrganization({
      organizationId: parent.id,
      userId: user.userId,
    });
  }
}
