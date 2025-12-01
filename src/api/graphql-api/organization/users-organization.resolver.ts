import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UsersOrganizationModel } from 'src/api/graphql-api/organization/model/users-organization.model';
import { RoleApiService } from 'src/features/role/role-api.service';

@Resolver(() => UsersOrganizationModel)
export class UsersOrganizationResolver {
  constructor(private readonly roleApiService: RoleApiService) {}

  @ResolveField()
  role(@Parent() parent: UsersOrganizationModel) {
    return this.roleApiService.getRole({ roleId: parent.roleId });
  }
}
