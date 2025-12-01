import { UseGuards } from '@nestjs/common';
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
import { RoleApiService } from 'src/features/role/role-api.service';
import { UserApiService } from 'src/features/user/user-api.service';

@UseGuards(GqlJwtAuthGuard)
@Resolver(() => UserModel)
export class UserResolver {
  constructor(
    private readonly userApiService: UserApiService,
    private readonly roleApiService: RoleApiService,
  ) {}

  @Query(() => UserModel)
  async me(@CurrentUser() user: IAuthUser) {
    return this.userApiService.getUser({ userId: user.userId });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => ProjectsConnection)
  meProjects(
    @Args('data') data: GetMeProjectsInput,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.userApiService.getProjectsByUserId({
      ...data,
      userId: user.userId,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => UsersConnection)
  async searchUsers(@Args('data') data: SearchUsersInput) {
    return this.userApiService.searchUsers(data);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Boolean)
  public async updatePassword(
    @Args('data') data: UpdatePasswordInput,
    @CurrentUser() user: IAuthUser,
  ): Promise<boolean> {
    return this.userApiService.updatePassword({
      ...data,
      userId: user.userId,
    });
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Boolean)
  public async setUsername(
    @Args('data') data: SetUsernameInput,
    @CurrentUser() user: IAuthUser,
  ): Promise<boolean> {
    return this.userApiService.setUsername({
      ...data,
      userId: user.userId,
    });
  }

  @ResolveField()
  async organizationId(@Parent() parent: UserModel) {
    const ownerRole =
      await this.userApiService.deprecatedGetOwnedUserOrganization({
        userId: parent.id,
      });

    return ownerRole?.organizationId;
  }

  @ResolveField()
  async role(@Parent() parent: UserModel) {
    if (!parent.roleId) {
      return null;
    }
    return this.roleApiService.getRole({ roleId: parent.roleId });
  }
}
