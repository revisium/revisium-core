import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { QueryBus } from '@nestjs/cqrs';
import { RoleModel } from 'src/api/graphql-api/role/model/role.model';
import { GetRolePermissionsQuery } from 'src/features/role/queries/impl/get-role-permissions.query';

@Resolver(() => RoleModel)
export class RoleResolver {
  constructor(private readonly queryBus: QueryBus) {}

  @ResolveField()
  permissions(@Parent() parent: RoleModel) {
    return this.queryBus.execute(
      new GetRolePermissionsQuery({ roleId: parent.id }),
    );
  }
}
