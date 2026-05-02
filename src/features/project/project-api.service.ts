import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  AddUserToProjectCommand,
  AddUserToProjectCommandData,
  AddUserToProjectCommandReturnType,
  ApiCreateProjectCommand,
  ApiCreateProjectCommandData,
  ApiCreateProjectCommandReturnType,
  DeleteProjectCommand,
  DeleteProjectCommandData,
  DeleteProjectCommandReturnType,
  RemoveUserFromProjectCommand,
  RemoveUserFromProjectCommandData,
  RemoveUserFromProjectCommandReturnType,
  UpdateProjectCommand,
  UpdateProjectCommandData,
  UpdateProjectCommandReturnType,
  UpdateUserProjectRoleCommand,
  UpdateUserProjectRoleCommandData,
  UpdateUserProjectRoleCommandReturnType,
} from 'src/features/project/commands/impl';
import {
  FindProjectIdentityQuery,
  FindProjectIdentityQueryData,
  FindProjectIdentityQueryReturnType,
  GetAllBranchesByProjectQuery,
  GetAllBranchesByProjectQueryData,
  GetAllBranchesByProjectQueryReturnType,
  GetProjectQuery,
  GetProjectQueryData,
  GetProjectQueryReturnType,
  GetProjectsByIdsQuery,
  GetProjectsByIdsQueryData,
  GetProjectsByIdsQueryReturnType,
  GetRootBranchByProjectQuery,
  GetRootBranchByProjectQueryData,
  GetRootBranchByProjectQueryReturnType,
  GetUsersProjectQuery,
  GetUsersProjectQueryData,
  GetUsersProjectQueryReturnType,
} from 'src/features/project/queries/impl';
import { ProjectCacheService } from 'src/infrastructure/cache/services/project-cache.service';

@Injectable()
export class ProjectApiService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly projectCache: ProjectCacheService,
  ) {}

  public resolveProject(data: FindProjectIdentityQueryData) {
    const identityQuery: FindProjectIdentityQueryData = {
      organizationId: data.organizationId,
      projectName: data.projectName,
      projectId: data.projectId,
      revisionId: data.revisionId,
      endpointId: data.endpointId,
    };

    return this.projectCache.projectIdentity(identityQuery, () =>
      this.queryBus.execute<
        FindProjectIdentityQuery,
        FindProjectIdentityQueryReturnType
      >(new FindProjectIdentityQuery(identityQuery)),
    );
  }

  public getProject(data: GetProjectQueryData) {
    return this.queryBus.execute<GetProjectQuery, GetProjectQueryReturnType>(
      new GetProjectQuery(data),
    );
  }

  public getProjectsByIds(data: GetProjectsByIdsQueryData) {
    return this.queryBus.execute<
      GetProjectsByIdsQuery,
      GetProjectsByIdsQueryReturnType
    >(new GetProjectsByIdsQuery(data));
  }

  public getRootBranchByProject(data: GetRootBranchByProjectQueryData) {
    return this.queryBus.execute<
      GetRootBranchByProjectQuery,
      GetRootBranchByProjectQueryReturnType
    >(new GetRootBranchByProjectQuery(data));
  }

  public getAllBranchesByProject(data: GetAllBranchesByProjectQueryData) {
    return this.queryBus.execute<
      GetAllBranchesByProjectQuery,
      GetAllBranchesByProjectQueryReturnType
    >(new GetAllBranchesByProjectQuery(data));
  }

  public getUsersProject(data: GetUsersProjectQueryData) {
    return this.queryBus.execute<
      GetUsersProjectQuery,
      GetUsersProjectQueryReturnType
    >(new GetUsersProjectQuery(data));
  }

  public apiCreateProject(data: ApiCreateProjectCommandData) {
    return this.commandBus.execute<
      ApiCreateProjectCommand,
      ApiCreateProjectCommandReturnType
    >(new ApiCreateProjectCommand(data));
  }

  public deleteProject(data: DeleteProjectCommandData) {
    return this.commandBus.execute<
      DeleteProjectCommand,
      DeleteProjectCommandReturnType
    >(new DeleteProjectCommand(data));
  }

  public updateProject(data: UpdateProjectCommandData) {
    return this.commandBus.execute<
      UpdateProjectCommand,
      UpdateProjectCommandReturnType
    >(new UpdateProjectCommand(data));
  }

  public addUserToProject(data: AddUserToProjectCommandData) {
    return this.commandBus.execute<
      AddUserToProjectCommand,
      AddUserToProjectCommandReturnType
    >(new AddUserToProjectCommand(data));
  }

  public removeUserFromProject(data: RemoveUserFromProjectCommandData) {
    return this.commandBus.execute<
      RemoveUserFromProjectCommand,
      RemoveUserFromProjectCommandReturnType
    >(new RemoveUserFromProjectCommand(data));
  }

  public updateUserProjectRole(data: UpdateUserProjectRoleCommandData) {
    return this.commandBus.execute<
      UpdateUserProjectRoleCommand,
      UpdateUserProjectRoleCommandReturnType
    >(new UpdateUserProjectRoleCommand(data));
  }
}
