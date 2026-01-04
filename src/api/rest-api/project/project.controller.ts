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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiCommonErrors,
  ApiNotFoundError,
  ApiOrgProjectParams,
  ApiUserIdParam,
} from 'src/api/rest-api/share/decorators';
import { SuccessModelDto } from 'src/api/rest-api/share/model/success.model';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { OptionalHttpJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-http-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { HTTPProjectGuard } from 'src/features/auth/guards/project.guard';
import { ProjectApiService } from 'src/features/project/project-api.service';
import { RestMetricsInterceptor } from 'src/infrastructure/metrics/rest/rest-metrics.interceptor';
import { BranchesConnection, BranchModel } from 'src/api/rest-api/branch/model';
import { AddUserToProjectDto } from 'src/api/rest-api/project/dto/add-user-to-project.dto';
import { GetProjectBranchesDto } from 'src/api/rest-api/project/dto/get-project-branches.dto';
import { GetUsersProjectDto } from 'src/api/rest-api/project/dto/get-users-project.dto';
import { UpdateProjectDto } from 'src/api/rest-api/project/dto/update-project.dto';
import {
  ProjectModel,
  UsersProjectConnection,
} from 'src/api/rest-api/project/model';
import { transformFromPaginatedPrismaToUserProjectModel } from 'src/api/rest-api/share/utils/transformFromPrismaToUserProjectModel';

@UseInterceptors(RestMetricsInterceptor)
@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Controller('organization/:organizationId/projects')
@ApiTags('Project')
@ApiBearerAuth('access-token')
export class ProjectController {
  constructor(private readonly projectApi: ProjectApiService) {}

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get(':projectName')
  @ApiOrgProjectParams()
  @ApiOperation({ operationId: 'project', summary: 'Get project by name' })
  @ApiOkResponse({ type: ProjectModel })
  @ApiCommonErrors()
  @ApiNotFoundError('Project')
  async projectByName(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
  ) {
    return this.projectApi.getProject({
      projectName,
      organizationId,
    });
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get(':projectName/root-branch')
  @ApiOrgProjectParams()
  @ApiOperation({
    operationId: 'rootBranch',
    summary: 'Get root branch of the project',
  })
  @ApiOkResponse({ type: BranchModel })
  @ApiCommonErrors()
  @ApiNotFoundError('Project')
  async rootBranch(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
  ): Promise<BranchModel> {
    const project = await this.projectApi.getProject({
      organizationId,
      projectName,
    });

    return this.projectApi.getRootBranchByProject(project.id);
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get(':projectName/branches')
  @ApiOrgProjectParams()
  @ApiOperation({
    operationId: 'branches',
    summary: 'List all branches in the project',
  })
  @ApiOkResponse({ type: BranchesConnection })
  @ApiCommonErrors()
  @ApiNotFoundError('Project')
  async allBranches(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Query() data: GetProjectBranchesDto,
  ): Promise<BranchesConnection> {
    const project = await this.projectApi.getProject({
      organizationId,
      projectName,
    });

    return this.projectApi.getAllBranchesByProject({
      projectId: project.id,
      ...data,
    });
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Project,
  })
  @Delete(':projectName')
  @ApiOrgProjectParams()
  @ApiOperation({ operationId: 'deleteProject', summary: 'Delete a project' })
  @ApiOkResponse({ type: SuccessModelDto })
  @ApiCommonErrors()
  @ApiNotFoundError('Project')
  async deleteProject(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
  ): Promise<SuccessModelDto> {
    const result = await this.projectApi.deleteProject({
      organizationId,
      projectName,
    });

    return {
      success: result,
    };
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Project,
  })
  @Put(':projectName')
  @ApiOrgProjectParams()
  @ApiOperation({ operationId: 'updateProject', summary: 'Update project settings' })
  @ApiOkResponse({ type: SuccessModelDto })
  @ApiCommonErrors()
  @ApiNotFoundError('Project')
  async updateProject(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Body() data: UpdateProjectDto,
  ): Promise<SuccessModelDto> {
    const result = await this.projectApi.updateProject({
      organizationId,
      projectName,
      ...data,
    });

    return {
      success: result,
    };
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.read,
    subject: PermissionSubject.User,
  })
  @Get(':projectName/users')
  @ApiOrgProjectParams()
  @ApiOperation({
    operationId: 'usersProject',
    summary: 'List users with access to the project',
  })
  @ApiOkResponse({ type: UsersProjectConnection })
  @ApiCommonErrors()
  @ApiNotFoundError('Project')
  async usersProject(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Query() data: GetUsersProjectDto,
  ) {
    const result = await this.projectApi.getUsersProject({
      organizationId,
      projectName,
      ...data,
    });

    return transformFromPaginatedPrismaToUserProjectModel(result);
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.add,
    subject: PermissionSubject.User,
  })
  @Post(':projectName/users')
  @ApiOrgProjectParams()
  @ApiOperation({
    operationId: 'addUserToProject',
    summary: 'Add a user to the project',
  })
  @ApiOkResponse({ type: SuccessModelDto })
  @ApiCommonErrors()
  @ApiNotFoundError('Project')
  async addUserToProject(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Body() data: AddUserToProjectDto,
  ): Promise<SuccessModelDto> {
    const result = await this.projectApi.addUserToProject({
      organizationId,
      projectName,
      ...data,
    });

    return {
      success: result,
    };
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.User,
  })
  @Delete(':projectName/users/:userId')
  @ApiOrgProjectParams()
  @ApiUserIdParam()
  @ApiOperation({
    operationId: 'removeUserFromProject',
    summary: 'Remove a user from the project',
  })
  @ApiOkResponse({ type: SuccessModelDto })
  @ApiCommonErrors()
  @ApiNotFoundError('Project or User')
  async removeUserFromProject(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('userId') userId: string,
  ): Promise<SuccessModelDto> {
    const result = await this.projectApi.removeUserFromProject({
      organizationId,
      projectName,
      userId,
    });

    return {
      success: result,
    };
  }
}
