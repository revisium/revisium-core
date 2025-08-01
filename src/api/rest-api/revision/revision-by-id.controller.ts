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
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Endpoint } from '@prisma/client';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { OptionalHttpJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-http-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { HTTPProjectGuard } from 'src/features/auth/guards/project.guard';
import { ApiCreateBranchByRevisionIdCommand } from 'src/features/branch/commands/impl';
import { ApiCreateTableCommand } from 'src/features/draft/commands/impl/api-create-table.command';
import { ApiCreateTableHandlerReturnType } from 'src/features/draft/commands/types/api-create-table.handler.types';
import { ApiCreateEndpointCommand } from 'src/features/endpoint/commands/impl';
import { RevisionsApiService } from 'src/features/revision/revisions-api.service';
import { TableMigrations } from 'src/features/share/utils/schema/types/migration';
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
  CreateTableResponse,
  RevisionModel,
  TableMigrationsDto,
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
import {
  GetEndpointsByRevisionIdQuery,
  GetRevisionQuery,
  GetTablesByRevisionIdQuery,
  ResolveChildBranchesByRevisionQuery,
  ResolveParentByRevisionQuery,
} from 'src/features/revision/queries/impl';
import { ResolveChildByRevisionQuery } from 'src/features/revision/queries/impl/resolve-child-by-revision.query';

@UseInterceptors(RestMetricsInterceptor)
@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Controller('revision/:revisionId')
@ApiBearerAuth('access-token')
@ApiTags('Revision')
@ApiExtraModels(TableMigrationsDto)
export class RevisionByIdController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
    private readonly revisionApi: RevisionsApiService,
  ) {}

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get()
  @ApiOperation({ operationId: 'revision' })
  @ApiOkResponse({ type: RevisionModel })
  async revisionById(@Param('revisionId') revisionId: string) {
    return transformFromPrismaToRevisionModel(
      await this.queryBus.execute(new GetRevisionQuery({ revisionId })),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('parent-revision')
  @ApiOperation({ operationId: 'parentRevision' })
  @ApiOkResponse({ type: RevisionModel })
  async parent(@Param('revisionId') revisionId: string) {
    return transformFromPrismaToRevisionModel(
      await this.queryBus.execute(new ResolveParentByRevisionQuery(revisionId)),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('child-revision')
  @ApiOperation({ operationId: 'childRevision' })
  @ApiOkResponse({ type: RevisionModel })
  async child(@Param('revisionId') revisionId: string) {
    return transformFromPrismaToRevisionModel(
      await this.queryBus.execute(new ResolveChildByRevisionQuery(revisionId)),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('child-branches')
  @ApiOperation({ operationId: 'childBranches' })
  @ApiOkResponse({ type: [ChildBranchResponse] })
  async childBranches(@Param('revisionId') revisionId: string) {
    return this.queryBus.execute(
      new ResolveChildBranchesByRevisionQuery(revisionId),
    );
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
      await this.queryBus.execute(
        new GetTablesByRevisionIdQuery({
          revisionId,
          ...data,
        }),
      ),
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
      await this.queryBus.execute<GetEndpointsByRevisionIdQuery, Endpoint[]>(
        new GetEndpointsByRevisionIdQuery(revisionId),
      ),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('migrations')
  @ApiOperation({ operationId: 'migrations' })
  @ApiOkResponse({
    description: 'Retrieves all table migrations',
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(TableMigrationsDto) },
    },
  })
  async getMigrations(
    @Param('revisionId') revisionId: string,
  ): Promise<TableMigrations[]> {
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
      await this.commandBus.execute(
        new ApiCreateBranchByRevisionIdCommand({
          branchName: data.branchName,
          revisionId,
        }),
      ),
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
      await this.commandBus.execute(
        new ApiCreateEndpointCommand({
          revisionId,
          type: data.type,
        }),
      ),
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
    const result = await this.commandBus.execute<
      ApiCreateTableCommand,
      ApiCreateTableHandlerReturnType
    >(
      new ApiCreateTableCommand({
        revisionId,
        ...data,
      }),
    );

    return {
      branch: transformFromPrismaToBranchModel(result.branch),
      table: transformFromPrismaToTableModel(result.table),
    };
  }
}
