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
  @ApiOperation({ operationId: 'project' })
  @ApiOkResponse({ type: ProjectModel })
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
  @ApiOperation({ operationId: 'rootBranch' })
  @ApiOkResponse({ type: BranchModel })
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
  @ApiOperation({ operationId: 'branches' })
  @ApiOkResponse({ type: BranchesConnection })
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
  @ApiOperation({ operationId: 'deleteProject' })
  @ApiOkResponse({ type: SuccessModelDto })
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
  @ApiOperation({ operationId: 'updateProject' })
  @ApiOkResponse({ type: SuccessModelDto })
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
  @ApiOperation({ operationId: 'usersProject' })
  @ApiOkResponse({ type: UsersProjectConnection })
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
  @ApiOperation({ operationId: 'addUserToProject' })
  @ApiOkResponse({ type: SuccessModelDto })
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
  @ApiOperation({ operationId: 'removeUserFromProject' })
  @ApiOkResponse({ type: SuccessModelDto })
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
