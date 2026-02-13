import {
  Body,
  Controller,
  Delete,
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
import {
  ApiCommonErrors,
  ApiNotFoundError,
  ApiOrgProjectBranchParams,
} from 'src/api/rest-api/share/decorators';
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
import { SuccessModelDto } from 'src/api/rest-api/share/model/success.model';
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
  @ApiOrgProjectBranchParams()
  @ApiOperation({ operationId: 'branch', summary: 'Get branch by name' })
  @ApiOkResponse({ type: BranchModel })
  @ApiCommonErrors()
  @ApiNotFoundError('Branch')
  async branchByName(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
  ) {
    return this.resolveBranch(organizationId, projectName, branchName);
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('touched')
  @ApiOrgProjectBranchParams()
  @ApiOperation({
    operationId: 'branchTouched',
    summary: 'Check if branch has uncommitted changes',
  })
  @ApiOkResponse({ type: TouchedModelDto })
  @ApiCommonErrors()
  @ApiNotFoundError('Branch')
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
  @ApiOrgProjectBranchParams()
  @ApiOperation({
    operationId: 'parentBranch',
    summary: 'Get parent branch (if created from another branch)',
  })
  @ApiOkResponse({ type: ParentBranchResponse })
  @ApiCommonErrors()
  @ApiNotFoundError('Branch')
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
  @ApiOrgProjectBranchParams()
  @ApiOperation({
    operationId: 'startRevision',
    summary: 'Get the first revision of the branch',
  })
  @ApiOkResponse({ type: RevisionModel })
  @ApiCommonErrors()
  @ApiNotFoundError('Branch')
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
  @ApiOrgProjectBranchParams()
  @ApiOperation({
    operationId: 'headRevision',
    summary: 'Get the latest committed revision',
  })
  @ApiOkResponse({ type: RevisionModel })
  @ApiCommonErrors()
  @ApiNotFoundError('Branch')
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
  @ApiOrgProjectBranchParams()
  @ApiOperation({
    operationId: 'draftRevision',
    summary: 'Get the draft (working) revision for modifications',
  })
  @ApiOkResponse({ type: RevisionModel })
  @ApiCommonErrors()
  @ApiNotFoundError('Branch')
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
  @ApiOrgProjectBranchParams()
  @ApiOperation({
    operationId: 'revisions',
    summary: 'List all revisions in the branch',
  })
  @ApiOkResponse({ type: RevisionsConnection })
  @ApiCommonErrors()
  @ApiNotFoundError('Branch')
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
  @ApiOrgProjectBranchParams()
  @ApiOperation({
    operationId: 'createRevision',
    summary: 'Commit changes and create a new revision',
  })
  @ApiBody({ type: CreateRevisionDto })
  @ApiOkResponse({ type: RevisionModel })
  @ApiCommonErrors()
  @ApiNotFoundError('Branch')
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
  @ApiOrgProjectBranchParams()
  @ApiOperation({
    operationId: 'revertChanges',
    summary: 'Discard all uncommitted changes',
  })
  @ApiOkResponse({ type: BranchModel })
  @ApiCommonErrors()
  @ApiNotFoundError('Branch')
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

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Branch,
  })
  @Delete()
  @ApiOrgProjectBranchParams()
  @ApiOperation({
    operationId: 'deleteBranch',
    summary: 'Delete a non-root branch',
  })
  @ApiOkResponse({ type: SuccessModelDto })
  @ApiCommonErrors()
  @ApiNotFoundError('Branch')
  async deleteBranch(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
  ): Promise<SuccessModelDto> {
    await this.branchApi.deleteBranch({
      organizationId,
      projectName,
      branchName,
    });

    return { success: true };
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
