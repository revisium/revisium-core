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
import { HTTPOrganizationGuard } from 'src/auth/guards/organization.guard';
import { PermissionParams } from 'src/auth/guards/permission-params';
import { IOptionalAuthUser } from 'src/auth/types';
import { RestMetricsInterceptor } from 'src/metrics/rest/rest-metrics.interceptor';
import {
  AddUserToOrganizationCommand,
  RemoveUserFromOrganizationCommand,
} from 'src/organization/commands/impl';
import { ApiCreateProjectCommand } from 'src/project/commands/impl';
import {
  GetProjectsByOrganizationIdQuery,
  GetUsersOrganizationQuery,
  GetUsersOrganizationQueryReturnType,
} from 'src/organization/queries/impl';
import {
  AddUserToOrganizationDto,
  CreateProjectDto,
  GetProjectsDto,
  GetUsersOrganizationDto,
  RemoveUserFromOrganizationDto,
} from 'src/rest-api/organization/dto';
import {
  ProjectsConnection,
  UsersOrganizationConnection,
} from 'src/rest-api/organization/model';
import { ProjectModel } from 'src/rest-api/project/model';
import { transformFromPaginatedPrismaToUserOrganizationModel } from 'src/rest-api/share/utils/transformFromPrismaToUserOrganizationModel';

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
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPOrganizationGuard)
  @Get(':organizationId/projects')
  @ApiOperation({ operationId: 'projects' })
  @ApiOkResponse({ type: ProjectsConnection })
  projects(
    @Param('organizationId') organizationId: string,
    @Query() data: GetProjectsDto,
    @Request()
    req: {
      user: IOptionalAuthUser;
    },
  ) {
    return this.queryBus.execute(
      new GetProjectsByOrganizationIdQuery({
        userId: req.user?.userId,
        organizationId,
        ...data,
      }),
    );
  }

  @UseGuards(HttpJwtAuthGuard, HTTPOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Project,
  })
  @Post(':organizationId/projects')
  @ApiOperation({ operationId: 'createProject' })
  @ApiOkResponse({ type: ProjectModel })
  async createProject(
    @Param('organizationId') organizationId: string,
    @Body() data: CreateProjectDto,
    @Query('fromRevisionId') fromRevisionId?: string,
  ): Promise<ProjectModel> {
    return this.commandBus.execute<ApiCreateProjectCommand, ProjectModel>(
      new ApiCreateProjectCommand({
        organizationId,
        ...data,
        fromRevisionId,
      }),
    );
  }

  @UseGuards(HttpJwtAuthGuard, HTTPOrganizationGuard)
  @Get(':organizationId/users')
  @ApiOperation({ operationId: 'usersOrganization' })
  @ApiOkResponse({ type: UsersOrganizationConnection })
  async usersOrganizations(
    @Param('organizationId') organizationId: string,
    @Query() data: GetUsersOrganizationDto,
  ) {
    const result = await this.queryBus.execute<
      GetUsersOrganizationQuery,
      GetUsersOrganizationQueryReturnType
    >(
      new GetUsersOrganizationQuery({
        organizationId,
        ...data,
      }),
    );

    return transformFromPaginatedPrismaToUserOrganizationModel(result);
  }

  @UseGuards(HttpJwtAuthGuard, HTTPOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.add,
    subject: PermissionSubject.User,
  })
  @Post(':organizationId/users')
  @ApiOperation({ operationId: 'addUserToOrganization' })
  @ApiOkResponse({ type: Boolean })
  addUserToOrganization(
    @Param('organizationId') organizationId: string,
    @Body() data: AddUserToOrganizationDto,
  ) {
    return this.commandBus.execute<AddUserToOrganizationCommand, boolean>(
      new AddUserToOrganizationCommand({ ...data, organizationId }),
    );
  }

  @UseGuards(HttpJwtAuthGuard, HTTPOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.User,
  })
  @Delete(':organizationId/users')
  @ApiOperation({ operationId: 'removeUserFromOrganization' })
  @ApiOkResponse({ type: Boolean })
  removeUserFromOrganization(
    @Param('organizationId') organizationId: string,
    @Body() data: RemoveUserFromOrganizationDto,
  ) {
    return this.commandBus.execute<RemoveUserFromOrganizationCommand, boolean>(
      new RemoveUserFromOrganizationCommand({ ...data, organizationId }),
    );
  }
}
