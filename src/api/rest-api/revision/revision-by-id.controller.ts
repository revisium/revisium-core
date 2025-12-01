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
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { OptionalHttpJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-http-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { HTTPProjectGuard } from 'src/features/auth/guards/project.guard';
import { BranchApiService } from 'src/features/branch/branch-api.service';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import { EndpointApiService } from 'src/features/endpoint/queries/endpoint-api.service';
import { RevisionsApiService } from 'src/features/revision/revisions-api.service';
import { Migration } from '@revisium/schema-toolkit/types';
import { RestMetricsInterceptor } from 'src/infrastructure/metrics/rest/rest-metrics.interceptor';
import { CreateBranchByRevisionDto } from 'src/api/rest-api/branch/dto';
import { BranchModel } from 'src/api/rest-api/branch/model';
import { EndpointModel } from 'src/api/rest-api/endpoint/model';
import {
  CreateTableDto,
  GetRevisionTablesDto,
} from 'src/api/rest-api/revision/dto';
import { CreateEndpointDto } from 'src/api/rest-api/revision/dto/create-endpoint.dto';
import {
  ApplyMigrationsResponseDto,
  CreateTableResponse,
  InitMigrationDto,
  MigrationDto,
  RemoveMigrationDto,
  RenameMigrationDto,
  RevisionModel,
  UpdateMigrationDto,
} from 'src/api/rest-api/revision/model';
import { ChildBranchResponse } from 'src/api/rest-api/revision/model/child-branches.response';
import { transformFromPrismaToBranchModel } from 'src/api/rest-api/share/utils/transformFromPrismaToBranchModel';
import {
  transformFromPrismaToEndpointModel,
  transformFromPrismaToEndpointsModel,
} from 'src/api/rest-api/share/utils/transformFromPrismaToEndpointsModel';
import { transformFromPrismaToRevisionModel } from 'src/api/rest-api/share/utils/transformFromPrismaToRevisionModel';
import {
  transformFromPaginatedPrismaToTableModel,
  transformFromPrismaToTableModel,
} from 'src/api/rest-api/share/utils/transformFromPrismaToTableModel';
import { TablesConnection } from 'src/api/rest-api/table/model/table.model';

@UseInterceptors(RestMetricsInterceptor)
@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Controller('revision/:revisionId')
@ApiBearerAuth('access-token')
@ApiTags('Revision')
@ApiExtraModels(InitMigrationDto)
@ApiExtraModels(UpdateMigrationDto)
@ApiExtraModels(RenameMigrationDto)
@ApiExtraModels(RemoveMigrationDto)
export class RevisionByIdController {
  constructor(
    private readonly revisionApi: RevisionsApiService,
    private readonly draftApi: DraftApiService,
    private readonly branchApi: BranchApiService,
    private readonly endpointApi: EndpointApiService,
  ) {}

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get()
  @ApiOperation({ operationId: 'revision' })
  @ApiOkResponse({ type: RevisionModel })
  async revisionById(@Param('revisionId') revisionId: string) {
    return transformFromPrismaToRevisionModel(
      await this.revisionApi.revision({ revisionId }),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('parent-revision')
  @ApiOperation({ operationId: 'parentRevision' })
  @ApiOkResponse({ type: RevisionModel })
  async parent(@Param('revisionId') revisionId: string) {
    return transformFromPrismaToRevisionModel(
      await this.revisionApi.resolveParentByRevision(revisionId),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('child-revision')
  @ApiOperation({ operationId: 'childRevision' })
  @ApiOkResponse({ type: RevisionModel })
  async child(@Param('revisionId') revisionId: string) {
    return transformFromPrismaToRevisionModel(
      await this.revisionApi.resolveChildByRevision(revisionId),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('child-branches')
  @ApiOperation({ operationId: 'childBranches' })
  @ApiOkResponse({ type: [ChildBranchResponse] })
  async childBranches(@Param('revisionId') revisionId: string) {
    return this.revisionApi.resolveChildBranchesByRevision(revisionId);
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('tables')
  @ApiOperation({ operationId: 'tables' })
  @ApiOkResponse({ type: TablesConnection })
  async tables(
    @Param('revisionId') revisionId: string,
    @Query() data: GetRevisionTablesDto,
  ) {
    return transformFromPaginatedPrismaToTableModel(
      await this.revisionApi.getTablesByRevisionId({
        revisionId,
        ...data,
      }),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('endpoints')
  @ApiOperation({ operationId: 'endpoints' })
  @ApiOkResponse({ type: [EndpointModel] })
  async getEndpoints(
    @Param('revisionId') revisionId: string,
  ): Promise<EndpointModel[]> {
    return transformFromPrismaToEndpointsModel(
      await this.revisionApi.getEndpointsByRevisionId(revisionId),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('migrations')
  @ApiOperation({ operationId: 'migrations' })
  @ApiOkResponse({
    description: 'Retrieves all table migrations',
    schema: {
      type: 'array',
      items: {
        oneOf: [
          { $ref: getSchemaPath(InitMigrationDto) },
          { $ref: getSchemaPath(UpdateMigrationDto) },
          { $ref: getSchemaPath(RenameMigrationDto) },
          { $ref: getSchemaPath(RemoveMigrationDto) },
        ],
      },
    },
  })
  async getMigrations(
    @Param('revisionId') revisionId: string,
  ): Promise<Migration[]> {
    return this.revisionApi.migrations({ revisionId });
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Branch,
  })
  @Post('child-branches')
  @ApiOperation({ operationId: 'createBranch' })
  @ApiBody({ type: CreateBranchByRevisionDto })
  @ApiOkResponse({ type: BranchModel })
  async createBranch(
    @Param('revisionId') revisionId: string,
    @Body() data: CreateBranchByRevisionDto,
  ): Promise<BranchModel> {
    return transformFromPrismaToBranchModel(
      await this.branchApi.apiCreateBranchByRevisionId({
        branchName: data.branchName,
        revisionId,
      }),
    );
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Endpoint,
  })
  @Post('endpoints')
  @ApiOperation({ operationId: 'createEndpoint' })
  @ApiBody({ type: CreateEndpointDto })
  @ApiOkResponse({ type: EndpointModel })
  async createEndpoint(
    @Param('revisionId') revisionId: string,
    @Body() data: CreateEndpointDto,
  ): Promise<EndpointModel> {
    return transformFromPrismaToEndpointModel(
      await this.endpointApi.apiCreateEndpoint({
        revisionId,
        type: data.type,
      }),
    );
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Table,
  })
  @Post('tables')
  @ApiOperation({ operationId: 'createTable' })
  @ApiBody({ type: CreateTableDto })
  @ApiOkResponse({ type: CreateTableResponse })
  async createTable(
    @Param('revisionId') revisionId: string,
    @Body() data: CreateTableDto,
  ): Promise<CreateTableResponse> {
    const result = await this.draftApi.apiCreateTable({
      revisionId,
      ...data,
    });

    return {
      branch: transformFromPrismaToBranchModel(result.branch),
      table: transformFromPrismaToTableModel(result.table),
    };
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Table,
  })
  @Post('apply-migrations')
  @ApiOperation({ operationId: 'applyMigrations' })
  @ApiBody({
    schema: {
      type: 'array',
      items: {
        oneOf: [
          { $ref: getSchemaPath(InitMigrationDto) },
          { $ref: getSchemaPath(UpdateMigrationDto) },
          { $ref: getSchemaPath(RenameMigrationDto) },
          { $ref: getSchemaPath(RemoveMigrationDto) },
        ],
      },
    },
  })
  @ApiOkResponse({ type: ApplyMigrationsResponseDto, isArray: true })
  async applyMigrations(
    @Param('revisionId') revisionId: string,
    @Body() migrations: MigrationDto[],
  ) {
    return this.draftApi.applyMigrations({
      revisionId,
      migrations,
    });
  }
}
