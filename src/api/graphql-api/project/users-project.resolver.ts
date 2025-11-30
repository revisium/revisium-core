import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { QueryBus } from '@nestjs/cqrs';
import { UsersProjectModel } from 'src/api/graphql-api/project/model/users-project.model';
import { GetRoleQuery } from 'src/features/role/queries/impl/get-role.query';

@Resolver(() => UsersProjectModel)
export class UsersProjectResolver {
  constructor(private readonly queryBus: QueryBus) {}

  @ResolveField()
  role(@Parent() parent: UsersProjectModel) {
    if (parent.role) {
      return parent.role;
    }
    if (!parent.roleId) {
      return null;
    }
    return this.queryBus.execute(new GetRoleQuery({ roleId: parent.roleId }));
  }
}
