import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  AddUserToOrganizationCommand,
  AddUserToOrganizationCommandData,
  AddUserToOrganizationCommandReturnType,
  RemoveUserFromOrganizationCommand,
  RemoveUserFromOrganizationCommandData,
  RemoveUserFromOrganizationCommandReturnType,
} from 'src/features/organization/commands/impl';
import {
  GetOrganizationQuery,
  GetOrganizationQueryData,
  GetOrganizationQueryReturnType,
  GetProjectsByOrganizationIdQuery,
  GetProjectsByOrganizationIdQueryData,
  GetProjectsByOrganizationIdQueryReturnType,
  GetUsersOrganizationQuery,
  GetUsersOrganizationQueryData,
  GetUsersOrganizationQueryReturnType,
} from 'src/features/organization/queries/impl';

@Injectable()
export class OrganizationApiService {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  public organization(data: GetOrganizationQueryData) {
    return this.queryBus.execute<
      GetOrganizationQuery,
      GetOrganizationQueryReturnType
    >(new GetOrganizationQuery(data));
  }

  public getProjectsByOrganizationId(
    data: GetProjectsByOrganizationIdQueryData,
  ) {
    return this.queryBus.execute<
      GetProjectsByOrganizationIdQuery,
      GetProjectsByOrganizationIdQueryReturnType
    >(new GetProjectsByOrganizationIdQuery(data));
  }

  public getUsersOrganization(data: GetUsersOrganizationQueryData) {
    return this.queryBus.execute<
      GetUsersOrganizationQuery,
      GetUsersOrganizationQueryReturnType
    >(new GetUsersOrganizationQuery(data));
  }

  public addUserToOrganization(data: AddUserToOrganizationCommandData) {
    return this.commandBus.execute<
      AddUserToOrganizationCommand,
      AddUserToOrganizationCommandReturnType
    >(new AddUserToOrganizationCommand(data));
  }

  public removeUserFromOrganization(
    data: RemoveUserFromOrganizationCommandData,
  ) {
    return this.commandBus.execute<
      RemoveUserFromOrganizationCommand,
      RemoveUserFromOrganizationCommandReturnType
    >(new RemoveUserFromOrganizationCommand(data));
  }
}
