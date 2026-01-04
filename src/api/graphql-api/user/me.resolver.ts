import { UseGuards } from '@nestjs/common';
import { Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { IAuthUser } from 'src/features/auth/types';
import { CurrentUser } from 'src/api/graphql-api/current-user.decorator';
import { MeModel } from 'src/api/graphql-api/user/model/me.model';
import { RoleApiService } from 'src/features/role/role-api.service';
import { UserApiService } from 'src/features/user/user-api.service';

@UseGuards(GqlJwtAuthGuard)
@Resolver(() => MeModel)
export class MeResolver {
  constructor(
    private readonly userApiService: UserApiService,
    private readonly roleApiService: RoleApiService,
  ) {}

  @Query(() => MeModel)
  async me(@CurrentUser() user: IAuthUser) {
    return this.userApiService.getUser({ userId: user.userId });
  }

  @ResolveField()
  organizationId(@Parent() parent: MeModel) {
    return parent.username ?? null;
  }

  @ResolveField()
  async role(@Parent() parent: MeModel) {
    if (!parent.roleId) {
      return null;
    }
    return this.roleApiService.getRole({ roleId: parent.roleId });
  }
}
