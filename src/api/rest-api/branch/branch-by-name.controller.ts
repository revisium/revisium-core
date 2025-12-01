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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { OptionalHttpJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-http-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { HTTPProjectGuard } from 'src/features/auth/guards/project.guard';
import { BranchApiService } from 'src/features/branch/branch-api.service';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import { RestMetricsInterceptor } from 'src/infrastructure/metrics/rest/rest-metrics.interceptor';
import {
  CreateRevisionDto,
  GetBranchRevisionsDto,
  TouchedModelDto,
} from 'src/api/rest-api/branch/dto';
import {
  BranchModel,
  ParentBranchResponse,
} from 'src/api/rest-api/branch/model';
import {
  RevisionModel,
  RevisionsConnection,
} from 'src/api/rest-api/revision/model';
import { transformFromPrismaToBranchModel } from 'src/api/rest-api/share/utils/transformFromPrismaToBranchModel';
import {
  transformFromPaginatedPrismaToRevisionModel,
  transformFromPrismaToRevisionModel,
} from 'src/api/rest-api/share/utils/transformFromPrismaToRevisionModel';

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
    private readonly branchApi: BranchApiService,
    private readonly draftApi: DraftApiService,
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
  @ApiOkResponse({ type: TouchedModelDto })
  async getTouched(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
  ): Promise<TouchedModelDto> {
    const branch = await this.resolveBranch(
      organizationId,
      projectName,
      branchName,
    );

    return {
      touched: await this.branchApi.getTouchedByBranchId(branch.id),
    };
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
    const branch = await this.resolveBranch(
      organizationId,
      projectName,
      branchName,
    );

    return this.branchApi.resolveParentBranch({ branchId: branch.id });
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
    const branch = await this.resolveBranch(
      organizationId,
      projectName,
      branchName,
    );

    return transformFromPrismaToRevisionModel(
      await this.branchApi.getStartRevision(branch.id),
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
    const branch = await this.resolveBranch(
      organizationId,
      projectName,
      branchName,
    );

    return transformFromPrismaToRevisionModel(
      await this.branchApi.getHeadRevision(branch.id),
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
    const branch = await this.resolveBranch(
      organizationId,
      projectName,
      branchName,
    );

    return transformFromPrismaToRevisionModel(
      await this.branchApi.getDraftRevision(branch.id),
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
      await this.branchApi.getRevisionsByBranchId({
        branchId: branch.id,
        ...data,
      }),
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
      await this.draftApi.apiCreateRevision({
        organizationId,
        projectName,
        branchName,
        ...data,
      }),
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
      await this.branchApi.apiRevertChanges({
        organizationId,
        projectName,
        branchName,
      }),
    );
  }

  private resolveBranch(
    organizationId: string,
    projectName: string,
    branchName: string,
  ): Promise<BranchModel> {
    return this.branchApi.getBranch({
      organizationId,
      projectName,
      branchName,
    });
  }
}
