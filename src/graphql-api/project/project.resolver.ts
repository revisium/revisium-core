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
import { PermissionAction, PermissionSubject } from 'src/auth/consts';
import { GqlJwtAuthGuard } from 'src/auth/guards/jwt/gql-jwt-auth-guard.service';
import { OptionalGqlJwtAuthGuard } from 'src/auth/guards/jwt/optional-gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/auth/guards/permission-params';
import { GQLProjectGuard } from 'src/auth/guards/project.guard';
import {
  AddUserToProjectInput,
  DeleteProjectInput,
  GetProjectInput,
  GetUsersProjectInput,
  RemoveUserFromProjectInput,
  UpdateProjectInput,
} from 'src/graphql-api/project/inputs';
import { GetProjectBranchesInput } from 'src/graphql-api/project/inputs/get-project-branches.input';
import { ProjectModel } from 'src/graphql-api/project/model';
import { UsersProjectConnection } from 'src/graphql-api/project/model/users-project.connection';
import {
  AddUserToProjectCommand,
  DeleteProjectCommand,
  RemoveUserFromProjectCommand,
  UpdateProjectCommand,
} from 'src/project/commands/impl';
import {
  GetAllBranchesByProjectQuery,
  GetProjectQuery,
  GetRootBranchByProjectQuery,
  GetUsersProjectQuery,
} from 'src/project/queries/impl';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver(() => ProjectModel)
export class ProjectResolver {
  constructor(
    private queryBus: QueryBus,
    private commandBus: CommandBus,
  ) {}

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => ProjectModel)
  project(@Args('data') data: GetProjectInput) {
    return this.queryBus.execute(new GetProjectQuery(data));
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.read,
    subject: PermissionSubject.User,
  })
  @Query(() => UsersProjectConnection)
  usersProject(@Args('data') data: GetUsersProjectInput) {
    return this.queryBus.execute(new GetUsersProjectQuery({ ...data }));
  }

  @ResolveField()
  rootBranch(@Parent() data: ProjectModel) {
    return this.queryBus.execute(new GetRootBranchByProjectQuery(data.id));
  }

  @ResolveField()
  allBranches(
    @Parent() parent: ProjectModel,
    @Args('data') data: GetProjectBranchesInput,
  ) {
    return this.queryBus.execute(
      new GetAllBranchesByProjectQuery({ projectId: parent.id, ...data }),
    );
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Project,
  })
  @Mutation(() => Boolean)
  updateProject(@Args('data') data: UpdateProjectInput) {
    return this.commandBus.execute<UpdateProjectCommand, boolean>(
      new UpdateProjectCommand(data),
    );
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Project,
  })
  @Mutation(() => Boolean)
  deleteProject(@Args('data') data: DeleteProjectInput) {
    return this.commandBus.execute<DeleteProjectCommand, boolean>(
      new DeleteProjectCommand(data),
    );
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.add,
    subject: PermissionSubject.User,
  })
  @Mutation(() => Boolean)
  addUserToProject(@Args('data') data: AddUserToProjectInput) {
    return this.commandBus.execute<AddUserToProjectCommand, boolean>(
      new AddUserToProjectCommand(data),
    );
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.User,
  })
  @Mutation(() => Boolean)
  removeUserFromProject(@Args('data') data: RemoveUserFromProjectInput) {
    return this.commandBus.execute<RemoveUserFromProjectCommand, boolean>(
      new RemoveUserFromProjectCommand(data),
    );
  }
}
