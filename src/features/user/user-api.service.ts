import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  DeprecatedGetOwnedUserOrganizationQuery,
  DeprecatedGetOwnedUserOrganizationQueryData,
  DeprecatedGetOwnedUserOrganizationQueryReturnType,
  GetUserOrganizationQuery,
  GetUserOrganizationQueryData,
  GetUserOrganizationQueryReturnType,
  GetUserProjectQuery,
  GetUserProjectQueryData,
  GetUserProjectQueryReturnType,
} from 'src/features/user/queries/impl';

@Injectable()
export class UserApiService {
  constructor(private readonly queryBus: QueryBus) {}

  public userOrganization(data: GetUserOrganizationQueryData) {
    return this.queryBus.execute<
      GetUserOrganizationQuery,
      GetUserOrganizationQueryReturnType
    >(new GetUserOrganizationQuery(data));
  }

  public userProject(data: GetUserProjectQueryData) {
    return this.queryBus.execute<
      GetUserProjectQuery,
      GetUserProjectQueryReturnType
    >(new GetUserProjectQuery(data));
  }

  public deprecatedGetOwnedUserOrganization(
    data: DeprecatedGetOwnedUserOrganizationQueryData,
  ) {
    return this.queryBus.execute<
      DeprecatedGetOwnedUserOrganizationQuery,
      DeprecatedGetOwnedUserOrganizationQueryReturnType
    >(new DeprecatedGetOwnedUserOrganizationQuery(data));
  }
}
