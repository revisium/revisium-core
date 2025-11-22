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
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { IAuthUser } from 'src/features/auth/types';
import { CurrentUser } from 'src/api/graphql-api/current-user.decorator';
import { ProjectsConnection } from 'src/api/graphql-api/project/model/projects.connection';
import {
  GetMeProjectsInput,
  SearchUsersInput,
  SetUsernameInput,
  UpdatePasswordInput,
} from 'src/api/graphql-api/user/inputs';
import { UserModel } from 'src/api/graphql-api/user/model/user.model';
import { UsersConnection } from 'src/api/graphql-api/user/model/users.connection';
import {
  SetUsernameCommand,
  SetUsernameCommandReturnType,
  UpdatePasswordCommand,
  UpdatePasswordCommandReturnType,
} from 'src/features/user/commands/impl';
import {
  GetProjectsByUserIdQuery,
  GetProjectsByUserIdQueryReturnType,
  GetUserOrganizationQuery,
  GetUserOrganizationQueryReturnType,
  GetUserQuery,
  GetUserQueryReturnType,
  SearchUsersQuery,
  SearchUsersQueryReturnType,
} from 'src/features/user/queries/impl';

@UseGuards(GqlJwtAuthGuard)
@Resolver(() => UserModel)
export class UserResolver {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Query(() => UserModel)
  async me(@CurrentUser() user: IAuthUser) {
    return this.queryBus.execute<GetUserQuery, GetUserQueryReturnType>(
      new GetUserQuery({ userId: user.userId }),
    );
  }

  @UseGuards(GqlJwtAuthGuard) @Query(() => ProjectsConnection) meProjects(
    @Args('data') data: GetMeProjectsInput,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.queryBus.execute<
      GetProjectsByUserIdQuery,
      GetProjectsByUserIdQueryReturnType
    >(
      new GetProjectsByUserIdQuery({
        ...data,
        userId: user.userId,
      }),
    );
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => UsersConnection)
  async searchUsers(@Args('data') data: SearchUsersInput) {
    return this.queryBus.execute<SearchUsersQuery, SearchUsersQueryReturnType>(
      new SearchUsersQuery(data),
    );
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Boolean)
  public async updatePassword(
    @Args('data') data: UpdatePasswordInput,
    @CurrentUser() user: IAuthUser,
  ): Promise<boolean> {
    return this.commandBus.execute<
      UpdatePasswordCommand,
      UpdatePasswordCommandReturnType
    >(
      new UpdatePasswordCommand({
        ...data,
        userId: user.userId,
      }),
    );
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Boolean)
  public async setUsername(
    @Args('data') data: SetUsernameInput,
    @CurrentUser() user: IAuthUser,
  ): Promise<boolean> {
    return this.commandBus.execute<
      SetUsernameCommand,
      SetUsernameCommandReturnType
    >(
      new SetUsernameCommand({
        ...data,
        userId: user.userId,
      }),
    );
  }

  @ResolveField()
  async organizationId(@Parent() parent: UserModel) {
    return this.queryBus.execute<
      GetUserOrganizationQuery,
      GetUserOrganizationQueryReturnType
    >(new GetUserOrganizationQuery({ userId: parent.id }));
  }
}
