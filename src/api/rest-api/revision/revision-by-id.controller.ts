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
  ApiSecurity,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  ApiCommonErrors,
  ApiDraftRevisionIdParam,
  ApiNotFoundError,
  ApiRevisionIdParam,
} from 'src/api/rest-api/share/decorators';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { OptionalHttpJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-http-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { HTTPProjectGuard } from 'src/features/auth/guards/project.guard';
import { EndpointApiService } from 'src/features/endpoint/queries/endpoint-api.service';
import { RevisionsApiService } from 'src/features/revision/revisions-api.service';
import { BranchApiService } from 'src/features/branch/branch-api.service';
import { TableApiService } from 'src/features/table/table-api.service';
import { RowApiService } from 'src/features/row/row-api.service';
import { Migration } from '@revisium/schema-toolkit/types';
import { RestMetricsInterceptor } from 'src/infrastructure/metrics/rest/rest-metrics.interceptor';
import { CreateBranchByRevisionDto } from 'src/api/rest-api/branch/dto/create-branch-by-revision.dto';
import { BranchModel } from 'src/api/rest-api/branch/model';
import { EndpointModel } from 'src/api/rest-api/endpoint/model';
import { CreateTableDto } from 'src/api/rest-api/revision/dto/create-table.dto';
import { CreateEndpointDto } from 'src/api/rest-api/revision/dto/create-endpoint.dto';
import { GetRevisionChangesDto } from 'src/api/rest-api/revision/dto/get-revision-changes.dto';
import { GetRevisionTablesDto } from 'src/api/rest-api/revision/dto/get-revision-tables.dto';
import { GetRowChangesDto } from 'src/api/rest-api/revision/dto/get-row-changes.dto';
import { GetTableChangesDto } from 'src/api/rest-api/revision/dto/get-table-changes.dto';
import {
  ApplyMigrationsResponseDto,
  CreateTableResponse,
  InitMigrationDto,
  MigrationDto,
  RemoveMigrationDto,
  RenameMigrationDto,
  RevisionChangesResponse,
  RevisionModel,
  RowChangesConnection,
  TableChangesConnection,
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
@ApiSecurity('api-key')
@ApiTags('Revision')
@ApiExtraModels(InitMigrationDto)
@ApiExtraModels(UpdateMigrationDto)
@ApiExtraModels(RenameMigrationDto)
@ApiExtraModels(RemoveMigrationDto)
export class RevisionByIdController {
  constructor(
    private readonly revisionApi: RevisionsApiService,
    private readonly coreTables: TableApiService,
    private readonly coreRows: RowApiService,
    private readonly coreBranches: BranchApiService,
    private readonly endpointApi: EndpointApiService,
  ) {}

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get()
  @ApiRevisionIdParam()
  @ApiOperation({ operationId: 'revision', summary: 'Get revision by ID' })
  @ApiOkResponse({ type: RevisionModel })
  @ApiCommonErrors()
  @ApiNotFoundError('Revision')
  async revisionById(@Param('revisionId') revisionId: string) {
    return transformFromPrismaToRevisionModel(
      await this.revisionApi.getRevision({ revisionId }),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('parent-revision')
  @ApiRevisionIdParam()
  @ApiOperation({
    operationId: 'parentRevision',
    summary: 'Get parent revision',
  })
  @ApiOkResponse({ type: RevisionModel })
  @ApiCommonErrors()
  @ApiNotFoundError('Revision')
  async parent(@Param('revisionId') revisionId: string) {
    const parent = await this.revisionApi.getRevisionParent(revisionId);
    return parent ? transformFromPrismaToRevisionModel(parent) : null;
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('child-revision')
  @ApiRevisionIdParam()
  @ApiOperation({ operationId: 'childRevision', summary: 'Get child revision' })
  @ApiOkResponse({ type: RevisionModel })
  @ApiCommonErrors()
  @ApiNotFoundError('Revision')
  async child(@Param('revisionId') revisionId: string) {
    return transformFromPrismaToRevisionModel(
      await this.revisionApi.getRevisionChild(revisionId),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('child-branches')
  @ApiRevisionIdParam()
  @ApiOperation({
    operationId: 'childBranches',
    summary: 'List branches created from this revision',
  })
  @ApiOkResponse({ type: [ChildBranchResponse] })
  @ApiCommonErrors()
  @ApiNotFoundError('Revision')
  async childBranches(@Param('revisionId') revisionId: string) {
    return this.revisionApi.resolveChildBranchesByRevision(revisionId);
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('tables')
  @ApiRevisionIdParam()
  @ApiOperation({ operationId: 'tables', summary: 'List tables in revision' })
  @ApiOkResponse({ type: TablesConnection })
  @ApiCommonErrors()
  @ApiNotFoundError('Revision')
  async tables(
    @Param('revisionId') revisionId: string,
    @Query() data: GetRevisionTablesDto,
  ) {
    return transformFromPaginatedPrismaToTableModel(
      await this.coreTables.getTablesByRevisionId({
        ...data,
        revisionId,
      }),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('endpoints')
  @ApiRevisionIdParam()
  @ApiOperation({
    operationId: 'endpoints',
    summary: 'List API endpoints for this revision',
  })
  @ApiOkResponse({ type: [EndpointModel] })
  @ApiCommonErrors()
  @ApiNotFoundError('Revision')
  async getEndpoints(
    @Param('revisionId') revisionId: string,
  ): Promise<EndpointModel[]> {
    return transformFromPrismaToEndpointsModel(
      await this.revisionApi.getEndpointsByRevisionId(revisionId),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('migrations')
  @ApiRevisionIdParam()
  @ApiOperation({
    operationId: 'migrations',
    summary: 'Get schema migrations from this revision',
  })
  @ApiOkResponse({
    description: 'List of table migrations (init, update, rename, remove)',
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
  @ApiCommonErrors()
  @ApiNotFoundError('Revision')
  async getMigrations(
    @Param('revisionId') revisionId: string,
  ): Promise<Migration[]> {
    return this.coreTables.getMigrations({ revisionId });
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('changes')
  @ApiRevisionIdParam()
  @ApiOperation({
    operationId: 'revisionChanges',
    summary: 'Get revision changes summary',
  })
  @ApiOkResponse({ type: RevisionChangesResponse })
  @ApiCommonErrors()
  @ApiNotFoundError('Revision')
  async getRevisionChanges(
    @Param('revisionId') revisionId: string,
    @Query() data: GetRevisionChangesDto,
  ): Promise<RevisionChangesResponse> {
    return this.revisionApi.revisionChanges({
      revisionId,
      compareWithRevisionId: data.compareWithRevisionId,
      includeSystem: data.includeSystem,
    });
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('table-changes')
  @ApiRevisionIdParam()
  @ApiOperation({
    operationId: 'tableChanges',
    summary: 'Get paginated table changes for a revision',
  })
  @ApiOkResponse({ type: TableChangesConnection })
  @ApiCommonErrors()
  @ApiNotFoundError('Revision')
  async getTableChanges(
    @Param('revisionId') revisionId: string,
    @Query() data: GetTableChangesDto,
  ) {
    return this.coreTables.tableChanges({
      revisionId,
      first: data.first,
      after: data.after,
      compareWithRevisionId: data.compareWithRevisionId,
      filters: this.buildTableChangesFilters(data),
    });
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('row-changes')
  @ApiRevisionIdParam()
  @ApiOperation({
    operationId: 'rowChanges',
    summary: 'Get paginated row changes for a revision',
  })
  @ApiOkResponse({ type: RowChangesConnection })
  @ApiCommonErrors()
  @ApiNotFoundError('Revision')
  async getRowChanges(
    @Param('revisionId') revisionId: string,
    @Query() data: GetRowChangesDto,
  ) {
    return this.coreRows.rowChanges({
      revisionId,
      first: data.first,
      after: data.after,
      compareWithRevisionId: data.compareWithRevisionId,
      filters: this.buildRowChangesFilters(data),
    });
  }

  private buildTableChangesFilters(data: GetTableChangesDto) {
    if (
      !data.changeTypes &&
      !data.search &&
      data.withSchemaMigrations === undefined &&
      data.includeSystem === undefined
    ) {
      return undefined;
    }
    return {
      changeTypes: data.changeTypes,
      search: data.search,
      withSchemaMigrations: data.withSchemaMigrations,
      includeSystem: data.includeSystem,
    };
  }

  private buildRowChangesFilters(data: GetRowChangesDto) {
    if (
      !data.tableId &&
      !data.changeTypes &&
      !data.search &&
      data.includeSystem === undefined
    ) {
      return undefined;
    }
    return {
      tableId: data.tableId,
      changeTypes: data.changeTypes,
      search: data.search,
      includeSystem: data.includeSystem,
    };
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Branch,
  })
  @Post('child-branches')
  @ApiRevisionIdParam()
  @ApiOperation({
    operationId: 'createBranch',
    summary: 'Create a new branch from this revision',
  })
  @ApiBody({ type: CreateBranchByRevisionDto })
  @ApiOkResponse({ type: BranchModel })
  @ApiCommonErrors()
  @ApiNotFoundError('Revision')
  async createBranch(
    @Param('revisionId') revisionId: string,
    @Body() data: CreateBranchByRevisionDto,
  ): Promise<BranchModel> {
    return transformFromPrismaToBranchModel(
      await this.coreBranches.createBranch({
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
  @ApiRevisionIdParam()
  @ApiOperation({
    operationId: 'createEndpoint',
    summary: 'Create an API endpoint for this revision',
  })
  @ApiBody({ type: CreateEndpointDto })
  @ApiOkResponse({ type: EndpointModel })
  @ApiCommonErrors()
  @ApiNotFoundError('Revision')
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
  @ApiDraftRevisionIdParam()
  @ApiOperation({ operationId: 'createTable', summary: 'Create a new table' })
  @ApiBody({ type: CreateTableDto })
  @ApiOkResponse({ type: CreateTableResponse })
  @ApiCommonErrors()
  @ApiNotFoundError('Revision')
  async createTable(
    @Param('revisionId') revisionId: string,
    @Body() data: CreateTableDto,
  ): Promise<CreateTableResponse> {
    const result = await this.coreTables.createTable({
      ...data,
      revisionId,
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
  @ApiDraftRevisionIdParam()
  @ApiOperation({
    operationId: 'applyMigrations',
    summary: 'Apply schema migrations to this revision',
  })
  @ApiBody({
    description: 'Array of migration operations to apply',
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
  @ApiCommonErrors()
  @ApiNotFoundError('Revision')
  async applyMigrations(
    @Param('revisionId') revisionId: string,
    @Body() migrations: MigrationDto[],
  ) {
    return this.coreTables.applyMigrations({
      revisionId,
      migrations,
    });
  }
}
