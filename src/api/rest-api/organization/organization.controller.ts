import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiCommonErrors,
  ApiNotFoundError,
  ApiOrganizationIdParam,
} from 'src/api/rest-api/share/decorators';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { OptionalHttpJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-http-jwt-auth-guard.service';
import { HTTPOrganizationGuard } from 'src/features/auth/guards/organization.guard';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { IOptionalAuthUser } from 'src/features/auth/types';
import { RestMetricsInterceptor } from 'src/infrastructure/metrics/rest/rest-metrics.interceptor';
import { OrganizationApiService } from 'src/features/organization/organization-api.service';
import { ProjectApiService } from 'src/features/project/project-api.service';
import {
  AddUserToOrganizationDto,
  CreateProjectDto,
  GetProjectsDto,
  GetUsersOrganizationDto,
  RemoveUserFromOrganizationDto,
} from 'src/api/rest-api/organization/dto';
import {
  ProjectsConnection,
  UsersOrganizationConnection,
} from 'src/api/rest-api/organization/model';
import { ProjectModel } from 'src/api/rest-api/project/model';
import { transformFromPaginatedPrismaToUserOrganizationModel } from 'src/api/rest-api/share/utils/transformFromPrismaToUserOrganizationModel';

@UseInterceptors(RestMetricsInterceptor)
@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Organization,
})
@Controller('organization')
@ApiBearerAuth('access-token')
@ApiTags('Organization')
export class OrganizationController {
  constructor(
    private readonly organizationApiService: OrganizationApiService,
    private readonly projectApiService: ProjectApiService,
  ) {}

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPOrganizationGuard)
  @Get(':organizationId/projects')
  @ApiOrganizationIdParam()
  @ApiOperation({
    operationId: 'projects',
    summary: 'List projects in organization',
  })
  @ApiOkResponse({ type: ProjectsConnection })
  @ApiCommonErrors()
  @ApiNotFoundError('Organization')
  projects(
    @Param('organizationId') organizationId: string,
    @Query() data: GetProjectsDto,
    @Request()
    req: {
      user: IOptionalAuthUser;
    },
  ) {
    return this.organizationApiService.getProjectsByOrganizationId({
      ...data,
      userId: req.user?.userId,
      organizationId,
    });
  }

  @UseGuards(HttpJwtAuthGuard, HTTPOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Project,
  })
  @Post(':organizationId/projects')
  @ApiOrganizationIdParam()
  @ApiOperation({ operationId: 'createProject', summary: 'Create a new project' })
  @ApiQuery({
    name: 'fromRevisionId',
    required: false,
    description: 'Clone from existing revision',
  })
  @ApiOkResponse({ type: ProjectModel })
  @ApiCommonErrors()
  @ApiNotFoundError('Organization')
  createProject(
    @Param('organizationId') organizationId: string,
    @Body() data: CreateProjectDto,
    @Query('fromRevisionId') fromRevisionId?: string,
  ): Promise<ProjectModel> {
    return this.projectApiService.apiCreateProject({
      ...data,
      organizationId,
      fromRevisionId,
    });
  }

  @UseGuards(HttpJwtAuthGuard, HTTPOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.read,
    subject: PermissionSubject.User,
  })
  @Get(':organizationId/users')
  @ApiOrganizationIdParam()
  @ApiOperation({
    operationId: 'usersOrganization',
    summary: 'List users in organization',
  })
  @ApiOkResponse({ type: UsersOrganizationConnection })
  @ApiCommonErrors()
  @ApiNotFoundError('Organization')
  async usersOrganizations(
    @Param('organizationId') organizationId: string,
    @Query() data: GetUsersOrganizationDto,
  ) {
    const result = await this.organizationApiService.getUsersOrganization({
      ...data,
      organizationId,
    });

    return transformFromPaginatedPrismaToUserOrganizationModel(result);
  }

  @UseGuards(HttpJwtAuthGuard, HTTPOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.add,
    subject: PermissionSubject.User,
  })
  @Post(':organizationId/users')
  @ApiOrganizationIdParam()
  @ApiOperation({
    operationId: 'addUserToOrganization',
    summary: 'Add a user to the organization',
  })
  @ApiOkResponse({ type: Boolean })
  @ApiCommonErrors()
  @ApiNotFoundError('Organization')
  addUserToOrganization(
    @Param('organizationId') organizationId: string,
    @Body() data: AddUserToOrganizationDto,
  ) {
    return this.organizationApiService.addUserToOrganization({
      ...data,
      organizationId,
    });
  }

  @UseGuards(HttpJwtAuthGuard, HTTPOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.User,
  })
  @Delete(':organizationId/users')
  @ApiOrganizationIdParam()
  @ApiOperation({
    operationId: 'removeUserFromOrganization',
    summary: 'Remove a user from the organization',
  })
  @ApiOkResponse({ type: Boolean })
  @ApiCommonErrors()
  @ApiNotFoundError('Organization')
  removeUserFromOrganization(
    @Param('organizationId') organizationId: string,
    @Body() data: RemoveUserFromOrganizationDto,
  ) {
    return this.organizationApiService.removeUserFromOrganization({
      ...data,
      organizationId,
    });
  }
}
