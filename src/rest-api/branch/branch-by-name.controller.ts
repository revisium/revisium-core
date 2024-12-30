import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionAction, PermissionSubject } from 'src/auth/consts';
import { HttpJwtAuthGuard } from 'src/auth/guards/jwt/http-jwt-auth-guard.service';
import { OptionalHttpJwtAuthGuard } from 'src/auth/guards/jwt/optional-http-jwt-auth-guard.service';
import { PermissionParams } from 'src/auth/guards/permission-params';
import { HTTPProjectGuard } from 'src/auth/guards/project.guard';
import {
  GetBranchQuery,
  GetDraftRevisionQuery,
  GetHeadRevisionQuery,
  GetRevisionsByBranchIdQuery,
  GetStartRevisionQuery,
  GetTouchedByBranchIdQuery,
  ResolveParentBranchByBranchQuery,
} from 'src/branch/quieries/impl';
import { ApiCreateRevisionCommand } from 'src/draft/commands/impl/api-create-revision.command';
import { ApiRevertChangesCommand } from 'src/draft/commands/impl/api-revert-changes.command';
import { RestMetricsInterceptor } from 'src/metrics/rest/rest-metrics.interceptor';
import {
  CreateRevisionDto,
  GetBranchRevisionsDto,
} from 'src/rest-api/branch/dto';
import { BranchModel, ParentBranchResponse } from 'src/rest-api/branch/model';
import {
  RevisionModel,
  RevisionsConnection,
} from 'src/rest-api/revision/model';
import { transformFromPrismaToBranchModel } from 'src/rest-api/share/utils/transformFromPrismaToBranchModel';
import {
  transformFromPaginatedPrismaToRevisionModel,
  transformFromPrismaToRevisionModel,
} from 'src/rest-api/share/utils/transformFromPrismaToRevisionModel';

@UseInterceptors(RestMetricsInterceptor)
@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Controller(
  'organization/:organizationId/projects/:projectName/branches/:branchName',
)
@ApiBearerAuth('access-token')
@ApiTags('Branch')
export class BranchByNameController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get()
  @ApiOperation({ operationId: 'branch' })
  @ApiOkResponse({ type: BranchModel })
  async branchByName(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
  ) {
    return this.resolveBranch(organizationId, projectName, branchName);
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('touched')
  @ApiOperation({ operationId: 'branchTouched' })
  @ApiOkResponse({ type: Boolean })
  async getTouched(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
  ) {
    const branch: BranchModel = await this.resolveBranch(
      organizationId,
      projectName,
      branchName,
    );

    return this.queryBus.execute(new GetTouchedByBranchIdQuery(branch.id));
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('parent-branch')
  @ApiOperation({ operationId: 'parentBranch' })
  @ApiOkResponse({ type: ParentBranchResponse })
  async parentBranch(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
  ) {
    const branch: BranchModel = await this.resolveBranch(
      organizationId,
      projectName,
      branchName,
    );

    return this.queryBus.execute(
      new ResolveParentBranchByBranchQuery({
        branchId: branch.id,
      }),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('start-revision')
  @ApiOperation({ operationId: 'startRevision' })
  @ApiOkResponse({ type: RevisionModel })
  async start(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
  ) {
    const branch: BranchModel = await this.resolveBranch(
      organizationId,
      projectName,
      branchName,
    );

    return transformFromPrismaToRevisionModel(
      await this.queryBus.execute(new GetStartRevisionQuery(branch.id)),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('head-revision')
  @ApiOperation({ operationId: 'headRevision' })
  @ApiOkResponse({ type: RevisionModel })
  async head(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
  ) {
    const branch: BranchModel = await this.resolveBranch(
      organizationId,
      projectName,
      branchName,
    );

    return transformFromPrismaToRevisionModel(
      await this.queryBus.execute(new GetHeadRevisionQuery(branch.id)),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('draft-revision')
  @ApiOperation({ operationId: 'draftRevision' })
  @ApiOkResponse({ type: RevisionModel })
  async draft(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
  ) {
    const branch: BranchModel = await this.resolveBranch(
      organizationId,
      projectName,
      branchName,
    );

    return transformFromPrismaToRevisionModel(
      await this.queryBus.execute(new GetDraftRevisionQuery(branch.id)),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('revisions')
  @ApiOperation({ operationId: 'revisions' })
  @ApiOkResponse({ type: RevisionsConnection })
  async revisions(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
    @Query() data: GetBranchRevisionsDto,
  ) {
    const branch: BranchModel = await this.resolveBranch(
      organizationId,
      projectName,
      branchName,
    );

    return transformFromPaginatedPrismaToRevisionModel(
      await this.queryBus.execute(
        new GetRevisionsByBranchIdQuery({
          branchId: branch.id,
          ...data,
        }),
      ),
    );
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Revision,
  })
  @Post('create-revision')
  @ApiOperation({ operationId: 'createRevision' })
  @ApiBody({ type: CreateRevisionDto })
  @ApiOkResponse({ type: RevisionModel })
  async createRevision(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
    @Body() data: CreateRevisionDto,
  ): Promise<RevisionModel> {
    return transformFromPrismaToRevisionModel(
      await this.commandBus.execute(
        new ApiCreateRevisionCommand({
          organizationId,
          projectName,
          branchName,
          ...data,
        }),
      ),
    );
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.revert,
    subject: PermissionSubject.Revision,
  })
  @Post('revert-changes')
  @ApiOperation({ operationId: 'revertChanges' })
  @ApiOkResponse({ type: BranchModel })
  async revertChanges(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
  ): Promise<BranchModel> {
    return transformFromPrismaToBranchModel(
      await this.commandBus.execute(
        new ApiRevertChangesCommand({
          organizationId,
          projectName,
          branchName,
        }),
      ),
    );
  }

  private resolveBranch(
    organizationId: string,
    projectName: string,
    branchName: string,
  ): Promise<BranchModel> {
    return this.queryBus.execute(
      new GetBranchQuery({
        organizationId,
        projectName,
        branchName,
      }),
    );
  }
}
