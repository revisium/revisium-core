import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UsersProjectModel } from 'src/api/graphql-api/project/model/users-project.model';
import { RoleApiService } from 'src/features/role/role-api.service';

@Resolver(() => UsersProjectModel)
export class UsersProjectResolver {
  constructor(private readonly roleApiService: RoleApiService) {}

  @ResolveField()
  role(@Parent() parent: UsersProjectModel) {
    if (parent.role) {
      return parent.role;
    }
    if (!parent.roleId) {
      return null;
    }
    return this.roleApiService.getRole({ roleId: parent.roleId });
  }
}
