import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { Table } from '@prisma/client';
import { RenameTableResponse } from 'src/api/rest-api/table/model/rename-table.response';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { OptionalHttpJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-http-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { HTTPProjectGuard } from 'src/features/auth/guards/project.guard';
import { ApiCreateRowCommand } from 'src/features/draft/commands/impl/api-create-row.command';
import { ApiRemoveTableCommand } from 'src/features/draft/commands/impl/api-remove-table.command';
import {
  ApiRenameTableCommand,
  ApiRenameTableCommandReturnType,
} from 'src/features/draft/commands/impl/api-rename-table.command';
import { ApiUpdateTableCommand } from 'src/features/draft/commands/impl/api-update-table.command';
import { ApiCreateRowHandlerReturnType } from 'src/features/draft/commands/types/api-create-row.handler.types';
import { ApiRemoveTableHandlerReturnType } from 'src/features/draft/commands/types/api-remove-table.handler.types';
import { ApiUpdateTableHandlerReturnType } from 'src/features/draft/commands/types/api-update-table.handler.types';
import { RestMetricsInterceptor } from 'src/infrastructure/metrics/rest/rest-metrics.interceptor';
import { BranchModel } from 'src/api/rest-api/branch/model';
import { RowsConnection } from 'src/api/rest-api/row/model';
import { transformFromPrismaToBranchModel } from 'src/api/rest-api/share/utils/transformFromPrismaToBranchModel';
import {
  transformFromPaginatedPrismaToRowModel,
  transformFromPrismaToRowModel,
} from 'src/api/rest-api/share/utils/transformFromPrismaToRowModel';
import {
  transformFromPaginatedPrismaToTableModel,
  transformFromPrismaToTableModel,
} from 'src/api/rest-api/share/utils/transformFromPrismaToTableModel';
import {
  CreateRowDto,
  GetTableReferencesByDto,
  GetTableReferencesToDto,
  GetTableRowsDto,
  RenameTableDto,
  UpdateTableDto,
} from 'src/api/rest-api/table/dto';
import { CreateRowResponse } from 'src/api/rest-api/table/model';
import {
  TableModel,
  TablesConnection,
} from 'src/api/rest-api/table/model/table.model';
import { UpdateTableResponse } from 'src/api/rest-api/table/model/update-table.response';
import {
  GetCountRowsInTableQuery,
  ResolveTableCountReferencesByQuery,
  ResolveTableCountReferencesToQuery,
  ResolveTableReferencesByQuery,
  ResolveTableReferencesToQuery,
  ResolveTableSchemaQuery,
} from 'src/features/table/queries/impl';
import { GetRowsByTableQuery } from 'src/features/table/queries/impl/get-rows-by-table.query';
import { GetTableQuery } from 'src/features/table/queries/impl/get-table.query';

@UseInterceptors(RestMetricsInterceptor)
@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Controller('revision/:revisionId/tables/:tableId')
@ApiBearerAuth('access-token')
@ApiTags('Table')
export class TableByIdController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get()
  @ApiOperation({ operationId: 'table' })
  @ApiOkResponse({ type: TableModel })
  async table(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
  ) {
    return transformFromPrismaToTableModel(
      await this.resolveTable(revisionId, tableId),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('count-rows')
  @ApiOperation({ operationId: 'tableCountRows' })
  @ApiOkResponse({ type: Number })
  async countRows(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
  ) {
    const table = await this.resolveTable(revisionId, tableId);

    return this.queryBus.execute(
      new GetCountRowsInTableQuery({ tableVersionId: table.versionId }),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('rows')
  @ApiOperation({ operationId: 'rows' })
  @ApiOkResponse({ type: RowsConnection })
  async rows(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Query() data: GetTableRowsDto,
  ) {
    const table = await this.resolveTable(revisionId, tableId);

    return transformFromPaginatedPrismaToRowModel(
      await this.queryBus.execute(
        new GetRowsByTableQuery({
          revisionId,
          tableId,
          tableVersionId: table.versionId,
          ...data,
        }),
      ),
    );
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Row,
  })
  @Post('rows')
  @ApiOperation({ operationId: 'createRow' })
  @ApiBody({ type: CreateRowDto })
  @ApiOkResponse({ type: CreateRowResponse })
  async createRow(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Body() data: CreateRowDto,
  ): Promise<CreateRowResponse> {
    const result = await this.commandBus.execute<
      ApiCreateRowCommand,
      ApiCreateRowHandlerReturnType
    >(
      new ApiCreateRowCommand({
        revisionId,
        tableId,
        ...data,
      }),
    );

    return {
      table: transformFromPrismaToTableModel(result.table),
      previousVersionTableId: result.previousVersionTableId,
      row: transformFromPrismaToRowModel(result.row),
    };
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('schema')
  @ApiOperation({ operationId: 'tableSchema' })
  @ApiOkResponse({
    schema: { type: 'object' },
  })
  async schema(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
  ) {
    return this.queryBus.execute(
      new ResolveTableSchemaQuery({ revisionId, tableId }),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('count-references-by')
  @ApiOperation({ operationId: 'tableCountReferencesBy' })
  @ApiOkResponse({
    type: Number,
  })
  async countReferencesBy(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
  ) {
    return this.queryBus.execute(
      new ResolveTableCountReferencesByQuery({ revisionId, tableId }),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('references-by')
  @ApiOperation({ operationId: 'tableReferencesBy' })
  @ApiOkResponse({ type: TablesConnection })
  async referencesBy(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Query() data: GetTableReferencesByDto,
  ) {
    return transformFromPaginatedPrismaToTableModel(
      await this.queryBus.execute(
        new ResolveTableReferencesByQuery({ revisionId, tableId, ...data }),
      ),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('count-references-to')
  @ApiOperation({ operationId: 'tableCountReferencesTo' })
  @ApiOkResponse({
    type: Number,
  })
  async countReferencesTo(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
  ) {
    return this.queryBus.execute(
      new ResolveTableCountReferencesToQuery({ revisionId, tableId }),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('references-to')
  @ApiOperation({ operationId: 'tableReferencesTo' })
  @ApiOkResponse({ type: TablesConnection })
  async referencesTo(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Query() data: GetTableReferencesToDto,
  ) {
    return transformFromPaginatedPrismaToTableModel(
      await this.queryBus.execute(
        new ResolveTableReferencesToQuery({ revisionId, tableId, ...data }),
      ),
    );
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Table,
  })
  @Delete()
  @ApiOperation({ operationId: 'deleteTable' })
  @ApiOkResponse({ type: BranchModel })
  async deleteTable(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
  ): Promise<BranchModel> {
    const result = await this.commandBus.execute<
      ApiRemoveTableCommand,
      ApiRemoveTableHandlerReturnType
    >(new ApiRemoveTableCommand({ revisionId, tableId }));

    return transformFromPrismaToBranchModel(result.branch);
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Table,
  })
  @Patch()
  @ApiOperation({ operationId: 'updateTable' })
  @ApiBody({ type: UpdateTableDto })
  @ApiOkResponse({ type: UpdateTableResponse })
  async updateTable(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Body() data: UpdateTableDto,
  ): Promise<UpdateTableResponse> {
    const result = await this.commandBus.execute<
      ApiUpdateTableCommand,
      ApiUpdateTableHandlerReturnType
    >(
      new ApiUpdateTableCommand({ revisionId, tableId, patches: data.patches }),
    );

    return {
      table: result.table
        ? transformFromPrismaToTableModel(result.table)
        : undefined,
      previousVersionTableId: result.previousVersionTableId,
    };
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Table,
  })
  @Patch('rename')
  @ApiOperation({ operationId: 'renameTable' })
  @ApiBody({ type: UpdateTableDto })
  @ApiOkResponse({ type: UpdateTableResponse })
  async renameTable(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Body() data: RenameTableDto,
  ): Promise<RenameTableResponse> {
    const result = await this.commandBus.execute<
      ApiRenameTableCommand,
      ApiRenameTableCommandReturnType
    >(
      new ApiRenameTableCommand({
        revisionId,
        tableId,
        nextTableId: data.nextTableId,
      }),
    );

    return {
      table: result.table
        ? transformFromPrismaToTableModel(result.table)
        : undefined,
      previousVersionTableId: result.previousVersionTableId,
    };
  }

  private resolveTable(revisionId: string, tableId: string): Promise<Table> {
    return this.queryBus.execute(new GetTableQuery({ revisionId, tableId }));
  }
}
