import { UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { OptionalGqlJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-gql-jwt-auth-guard.service';
import { GQLOrganizationGuard } from 'src/features/auth/guards/organization.guard';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { IOptionalAuthUser } from 'src/features/auth/types';
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
import {
  AddUserToOrganizationCommand,
  RemoveUserFromOrganizationCommand,
} from 'src/features/organization/commands/impl';
import { ApiCreateProjectCommand } from 'src/features/project/commands/impl';
import {
  GetProjectsByOrganizationIdQuery,
  GetUsersOrganizationQuery,
} from 'src/features/organization/queries/impl';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Organization,
})
@Resolver()
export class OrganizationResolver {
  constructor(
    private queryBus: QueryBus,
    private commandBus: CommandBus,
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
    return this.queryBus.execute(
      new GetProjectsByOrganizationIdQuery({ ...data, userId: user?.userId }),
    );
  }

  @UseGuards(GqlJwtAuthGuard, GQLOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.read,
    subject: PermissionSubject.User,
  })
  @Query(() => UsersOrganizationConnection)
  usersOrganization(@Args('data') data: GetUsersOrganizationInput) {
    return this.queryBus.execute(new GetUsersOrganizationQuery({ ...data }));
  }

  @UseGuards(GqlJwtAuthGuard, GQLOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Project,
  })
  @Mutation(() => ProjectModel)
  createProject(@Args('data') data: CreateProjectInput) {
    return this.commandBus.execute<ApiCreateProjectCommand, string>(
      new ApiCreateProjectCommand(data),
    );
  }

  @UseGuards(GqlJwtAuthGuard, GQLOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.add,
    subject: PermissionSubject.User,
  })
  @Mutation(() => Boolean)
  addUserToOrganization(@Args('data') data: AddUserToOrganizationInput) {
    return this.commandBus.execute<AddUserToOrganizationCommand, boolean>(
      new AddUserToOrganizationCommand(data),
    );
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
    return this.commandBus.execute<RemoveUserFromOrganizationCommand, boolean>(
      new RemoveUserFromOrganizationCommand(data),
    );
  }
}
