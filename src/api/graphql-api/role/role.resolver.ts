import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { RoleModel } from 'src/api/graphql-api/role/model/role.model';
import { RoleApiService } from 'src/features/role/role-api.service';

@Resolver(() => RoleModel)
export class RoleResolver {
  constructor(private readonly roleApiService: RoleApiService) {}

  @ResolveField()
  permissions(@Parent() parent: RoleModel) {
    return this.roleApiService.permissions({ roleId: parent.id });
  }
}
