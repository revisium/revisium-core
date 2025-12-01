import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  GetRolePermissionsQuery,
  GetRolePermissionsQueryData,
  GetRolePermissionsQueryReturnType,
  GetRoleQuery,
  GetRoleQueryData,
  GetRoleQueryReturnType,
} from 'src/features/role/queries/impl';

@Injectable()
export class RoleApiService {
  constructor(private readonly queryBus: QueryBus) {}

  public permissions(data: GetRolePermissionsQueryData) {
    return this.queryBus.execute<
      GetRolePermissionsQuery,
      GetRolePermissionsQueryReturnType
    >(new GetRolePermissionsQuery(data));
  }

  public getRole(data: GetRoleQueryData) {
    return this.queryBus.execute<GetRoleQuery, GetRoleQueryReturnType>(
      new GetRoleQuery(data),
    );
  }
}
