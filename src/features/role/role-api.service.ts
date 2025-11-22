import { QueryBus } from '@nestjs/cqrs';
import {
  GetRolePermissionsQuery,
  GetRolePermissionsQueryData,
  GetRolePermissionsQueryReturnType,
} from 'src/features/role/queries/impl';

export class RoleApiService {
  constructor(private readonly queryBus: QueryBus) {}

  public permissions(data: GetRolePermissionsQueryData) {
    return this.queryBus.execute<
      GetRolePermissionsQuery,
      GetRolePermissionsQueryReturnType
    >(new GetRolePermissionsQuery(data));
  }
}
