import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  SetUsernameCommand,
  SetUsernameCommandData,
  SetUsernameCommandReturnType,
  UpdatePasswordCommand,
  UpdatePasswordCommandData,
  UpdatePasswordCommandReturnType,
} from 'src/features/user/commands/impl';
import {
  DeprecatedGetOwnedUserOrganizationQuery,
  DeprecatedGetOwnedUserOrganizationQueryData,
  DeprecatedGetOwnedUserOrganizationQueryReturnType,
  GetProjectsByUserIdQuery,
  GetProjectsByUserIdQueryData,
  GetProjectsByUserIdQueryReturnType,
  GetUserOrganizationQuery,
  GetUserOrganizationQueryData,
  GetUserOrganizationQueryReturnType,
  GetUserProjectQuery,
  GetUserProjectQueryData,
  GetUserProjectQueryReturnType,
  GetUserQuery,
  GetUserQueryData,
  GetUserQueryReturnType,
  SearchUsersQuery,
  SearchUsersQueryData,
  SearchUsersQueryReturnType,
} from 'src/features/user/queries/impl';

@Injectable()
export class UserApiService {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  public getUser(data: GetUserQueryData) {
    return this.queryBus.execute<GetUserQuery, GetUserQueryReturnType>(
      new GetUserQuery(data),
    );
  }

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

  public updatePassword(data: UpdatePasswordCommandData) {
    return this.commandBus.execute<
      UpdatePasswordCommand,
      UpdatePasswordCommandReturnType
    >(new UpdatePasswordCommand(data));
  }

  public getProjectsByUserId(data: GetProjectsByUserIdQueryData) {
    return this.queryBus.execute<
      GetProjectsByUserIdQuery,
      GetProjectsByUserIdQueryReturnType
    >(new GetProjectsByUserIdQuery(data));
  }

  public searchUsers(data: SearchUsersQueryData) {
    return this.queryBus.execute<SearchUsersQuery, SearchUsersQueryReturnType>(
      new SearchUsersQuery(data),
    );
  }

  public setUsername(data: SetUsernameCommandData) {
    return this.commandBus.execute<
      SetUsernameCommand,
      SetUsernameCommandReturnType
    >(new SetUsernameCommand(data));
  }
}
