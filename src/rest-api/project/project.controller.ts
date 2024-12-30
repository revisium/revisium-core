import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionAction, PermissionSubject } from 'src/auth/consts';
import { HttpJwtAuthGuard } from 'src/auth/guards/jwt/http-jwt-auth-guard.service';
import { OptionalHttpJwtAuthGuard } from 'src/auth/guards/jwt/optional-http-jwt-auth-guard.service';
import { PermissionParams } from 'src/auth/guards/permission-params';
import { HTTPProjectGuard } from 'src/auth/guards/project.guard';
import { RestMetricsInterceptor } from 'src/metrics/rest/rest-metrics.interceptor';
import {
  AddUserToProjectCommand,
  DeleteProjectCommand,
  RemoveUserFromProjectCommand,
  UpdateProjectCommand,
} from 'src/project/commands/impl';
import {
  GetAllBranchesByProjectQuery,
  GetProjectQuery,
  GetRootBranchByProjectQuery,
  GetUsersProjectQuery,
  GetUsersProjectQueryReturnType,
} from 'src/project/queries/impl';
import { BranchesConnection, BranchModel } from 'src/rest-api/branch/model';
import { AddUserToProjectDto } from 'src/rest-api/project/dto/add-user-to-project.dto';
import { GetProjectBranchesDto } from 'src/rest-api/project/dto/get-project-branches.dto';
import { GetUsersProjectDto } from 'src/rest-api/project/dto/get-users-project.dto';
import { UpdateProjectDto } from 'src/rest-api/project/dto/update-project.dto';
import {
  ProjectModel,
  UsersProjectConnection,
} from 'src/rest-api/project/model';
import { transformFromPaginatedPrismaToUserProjectModel } from 'src/rest-api/share/utils/transformFromPrismaToUserProjectModel';

@UseInterceptors(RestMetricsInterceptor)
@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Controller('organization/:organizationId/projects')
@ApiTags('Project')
@ApiBearerAuth('access-token')
export class ProjectController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get(':projectName')
  @ApiOperation({ operationId: 'project' })
  @ApiOkResponse({ type: ProjectModel })
  async projectByName(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
  ) {
    return this.queryBus.execute(
      new GetProjectQuery({
        projectName,
        organizationId,
      }),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get(':projectName/root-branch')
  @ApiOperation({ operationId: 'rootBranch' })
  @ApiOkResponse({ type: BranchModel })
  async rootBranch(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
  ): Promise<BranchModel> {
    const project: ProjectModel = await this.queryBus.execute(
      new GetProjectQuery({
        organizationId,
        projectName,
      }),
    );

    return this.queryBus.execute(new GetRootBranchByProjectQuery(project.id));
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get(':projectName/branches')
  @ApiOperation({ operationId: 'branches' })
  @ApiOkResponse({ type: BranchesConnection })
  async allBranches(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Query() data: GetProjectBranchesDto,
  ): Promise<BranchModel> {
    const project: ProjectModel = await this.queryBus.execute(
      new GetProjectQuery({
        organizationId,
        projectName,
      }),
    );

    return this.queryBus.execute(
      new GetAllBranchesByProjectQuery({ projectId: project.id, ...data }),
    );
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Project,
  })
  @Delete(':projectName')
  @ApiOperation({ operationId: 'deleteProject' })
  @ApiOkResponse({ type: Boolean })
  async deleteProject(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
  ): Promise<boolean> {
    return this.commandBus.execute<DeleteProjectCommand, boolean>(
      new DeleteProjectCommand({ organizationId, projectName }),
    );
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Project,
  })
  @Put(':projectName')
  @ApiOperation({ operationId: 'updateProject' })
  @ApiOkResponse({ type: Boolean })
  async updateProject(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Body() data: UpdateProjectDto,
  ): Promise<boolean> {
    return this.commandBus.execute<UpdateProjectCommand, boolean>(
      new UpdateProjectCommand({ organizationId, projectName, ...data }),
    );
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.read,
    subject: PermissionSubject.User,
  })
  @Get(':projectName/users')
  @ApiOperation({ operationId: 'usersProject' })
  @ApiOkResponse({ type: UsersProjectConnection })
  async usersProject(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Query() data: GetUsersProjectDto,
  ) {
    const result = await this.queryBus.execute<
      GetUsersProjectQuery,
      GetUsersProjectQueryReturnType
    >(new GetUsersProjectQuery({ organizationId, projectName, ...data }));

    return transformFromPaginatedPrismaToUserProjectModel(result);
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.add,
    subject: PermissionSubject.User,
  })
  @Post(':projectName/users')
  @ApiOperation({ operationId: 'addUserToProject' })
  @ApiOkResponse({ type: Boolean })
  async addUserToProject(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Body() data: AddUserToProjectDto,
  ): Promise<boolean> {
    return this.commandBus.execute<AddUserToProjectCommand, boolean>(
      new AddUserToProjectCommand({ organizationId, projectName, ...data }),
    );
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.User,
  })
  @Delete(':projectName/users/:userId')
  @ApiOperation({ operationId: 'removeUserFromProject' })
  @ApiOkResponse({ type: Boolean })
  async removeUserFromProject(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('userId') userId: string,
  ): Promise<boolean> {
    return this.commandBus.execute<RemoveUserFromProjectCommand, boolean>(
      new RemoveUserFromProjectCommand({
        organizationId,
        projectName,
        userId,
      }),
    );
  }
}
