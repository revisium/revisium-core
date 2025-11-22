import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { QueryBus } from '@nestjs/cqrs';
import { UsersOrganizationModel } from 'src/api/graphql-api/organization/model/users-organization.model';
import { GetRoleQuery } from 'src/features/role/queries/impl/get-role.query';

@Resolver(() => UsersOrganizationModel)
export class UsersOrganizationResolver {
  constructor(private readonly queryBus: QueryBus) {}

  @ResolveField()
  role(@Parent() parent: UsersOrganizationModel) {
    return this.queryBus.execute(new GetRoleQuery({ roleId: parent.roleId }));
  }
}
