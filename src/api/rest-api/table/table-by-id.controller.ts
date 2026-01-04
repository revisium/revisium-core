import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
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
  ApiDraftRevisionTableParams,
  ApiNotFoundError,
  ApiRevisionTableParams,
} from 'src/api/rest-api/share/decorators';
import { mapToPrismaOrderBy } from 'src/api/utils/mapToPrismaOrderBy';
import { RenameTableResponse } from 'src/api/rest-api/table/model/rename-table.response';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { OptionalHttpJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-http-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { HTTPProjectGuard } from 'src/features/auth/guards/project.guard';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import { RowApiService } from 'src/features/row/row-api.service';
import { TableApiService } from 'src/features/table/table-api.service';
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
  CreateRowsDto,
  GetTableForeignKeysByDto,
  GetTableForeignKeysToDto,
  GetTableRowsDto,
  PatchRowsDto,
  RemoveRowsDto,
  RenameTableDto,
  UpdateRowsDto,
  UpdateTableDto,
} from 'src/api/rest-api/table/dto';
import {
  CreateRowResponse,
  CreateRowsResponse,
  PatchRowsResponse,
  RemoveRowsResponse,
  UpdateRowsResponse,
} from 'src/api/rest-api/table/model';
import {
  TableModel,
  TablesConnection,
} from 'src/api/rest-api/table/model/table.model';
import { UpdateTableResponse } from 'src/api/rest-api/table/model/update-table.response';
import { Table } from 'src/__generated__/client';

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
    private readonly tableApi: TableApiService,
    private readonly draftApi: DraftApiService,
    private readonly rowApi: RowApiService,
  ) {}

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get()
  @ApiRevisionTableParams()
  @ApiOperation({ operationId: 'table', summary: 'Get table by ID' })
  @ApiOkResponse({ type: TableModel })
  @ApiCommonErrors()
  @ApiNotFoundError('Table')
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
  @ApiRevisionTableParams()
  @ApiOperation({ operationId: 'tableCountRows', summary: 'Get row count in table' })
  @ApiOkResponse({ type: Number })
  @ApiCommonErrors()
  @ApiNotFoundError('Table')
  async countRows(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
  ) {
    const table = await this.resolveTable(revisionId, tableId);

    return this.tableApi.getCountRowsInTable({
      tableVersionId: table.versionId,
    });
  }

  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Post('rows')
  @ApiRevisionTableParams()
  @ApiOperation({
    operationId: 'rows',
    summary: 'List rows in table with filtering and sorting',
  })
  @ApiOkResponse({ type: RowsConnection })
  @ApiCommonErrors()
  @ApiNotFoundError('Table')
  @HttpCode(HttpStatus.OK)
  async rows(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Body() { orderBy, where, ...data }: GetTableRowsDto,
  ) {
    const prismaOrderBy = mapToPrismaOrderBy(orderBy);

    return transformFromPaginatedPrismaToRowModel(
      await this.rowApi.getRows({
        ...data,
        revisionId,
        tableId,
        orderBy: prismaOrderBy,
        where,
      }),
    );
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Row,
  })
  @Post('create-row')
  @ApiDraftRevisionTableParams()
  @ApiOperation({ operationId: 'createRow', summary: 'Create a new row' })
  @ApiBody({ type: CreateRowDto })
  @ApiOkResponse({ type: CreateRowResponse })
  @ApiCommonErrors()
  @ApiNotFoundError('Table')
  async createRow(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Body() data: CreateRowDto,
  ): Promise<CreateRowResponse> {
    const result = await this.draftApi.apiCreateRow({
      ...data,
      revisionId,
      tableId,
    });

    return {
      table: transformFromPrismaToTableModel(result.table),
      previousVersionTableId: result.previousVersionTableId,
      row: transformFromPrismaToRowModel(result.row),
    };
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Row,
  })
  @Post('create-rows')
  @ApiDraftRevisionTableParams()
  @ApiOperation({ operationId: 'createRows', summary: 'Create multiple rows' })
  @ApiBody({ type: CreateRowsDto })
  @ApiOkResponse({ type: CreateRowsResponse })
  @ApiCommonErrors()
  @ApiNotFoundError('Table')
  async createRows(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Body() data: CreateRowsDto,
  ): Promise<CreateRowsResponse> {
    const result = await this.draftApi.apiCreateRows({
      revisionId,
      tableId,
      rows: data.rows,
      isRestore: data.isRestore,
    });

    return {
      table: transformFromPrismaToTableModel(result.table),
      previousVersionTableId: result.previousVersionTableId,
      rows: result.rows.map(transformFromPrismaToRowModel),
    };
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Row,
  })
  @Put('update-rows')
  @ApiDraftRevisionTableParams()
  @ApiOperation({
    operationId: 'updateRows',
    summary: 'Replace data for multiple rows',
  })
  @ApiBody({ type: UpdateRowsDto })
  @ApiOkResponse({ type: UpdateRowsResponse })
  @ApiCommonErrors()
  @ApiNotFoundError('Table')
  async updateRows(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Body() data: UpdateRowsDto,
  ): Promise<UpdateRowsResponse> {
    const result = await this.draftApi.apiUpdateRows({
      revisionId,
      tableId,
      rows: data.rows,
      isRestore: data.isRestore,
    });

    return {
      table: transformFromPrismaToTableModel(result.table),
      previousVersionTableId: result.previousVersionTableId,
      rows: result.rows.map(transformFromPrismaToRowModel),
    };
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Row,
  })
  @Patch('patch-rows')
  @ApiDraftRevisionTableParams()
  @ApiOperation({
    operationId: 'patchRows',
    summary: 'Patch multiple rows using JSON Patch',
  })
  @ApiBody({ type: PatchRowsDto })
  @ApiOkResponse({ type: PatchRowsResponse })
  @ApiCommonErrors()
  @ApiNotFoundError('Table')
  async patchRows(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Body() data: PatchRowsDto,
  ): Promise<PatchRowsResponse> {
    const result = await this.draftApi.apiPatchRows({
      revisionId,
      tableId,
      rows: data.rows,
    });

    return {
      table: transformFromPrismaToTableModel(result.table),
      previousVersionTableId: result.previousVersionTableId,
      rows: result.rows.map(transformFromPrismaToRowModel),
    };
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Row,
  })
  @Delete('rows')
  @ApiDraftRevisionTableParams()
  @ApiOperation({ operationId: 'deleteRows', summary: 'Delete multiple rows' })
  @ApiBody({ type: RemoveRowsDto })
  @ApiOkResponse({ type: RemoveRowsResponse })
  @ApiCommonErrors()
  @ApiNotFoundError('Table')
  async deleteRows(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Body() dto: RemoveRowsDto,
  ): Promise<RemoveRowsResponse> {
    const result = await this.draftApi.apiRemoveRows({
      revisionId,
      tableId,
      rowIds: dto.rowIds,
    });

    return {
      branch: transformFromPrismaToBranchModel(result.branch),
      table: result.table
        ? transformFromPrismaToTableModel(result.table)
        : undefined,
      previousVersionTableId: result.previousVersionTableId,
    };
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('schema')
  @ApiRevisionTableParams()
  @ApiOperation({ operationId: 'tableSchema', summary: 'Get table JSON Schema' })
  @ApiOkResponse({
    description: 'JSON Schema defining the table structure',
    schema: { type: 'object' },
  })
  @ApiCommonErrors()
  @ApiNotFoundError('Table')
  async schema(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
  ) {
    return this.tableApi.resolveTableSchema({ revisionId, tableId });
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('count-foreign-keys-by')
  @ApiRevisionTableParams()
  @ApiOperation({
    operationId: 'tableCountForeignKeysBy',
    summary: 'Count tables that reference this table',
  })
  @ApiOkResponse({ type: Number })
  @ApiCommonErrors()
  @ApiNotFoundError('Table')
  async countForeignKeysBy(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
  ) {
    return this.tableApi.resolveTableCountForeignKeysBy({
      revisionId,
      tableId,
    });
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('foreign-keys-by')
  @ApiRevisionTableParams()
  @ApiOperation({
    operationId: 'tableForeignKeysBy',
    summary: 'List tables that reference this table',
  })
  @ApiOkResponse({ type: TablesConnection })
  @ApiCommonErrors()
  @ApiNotFoundError('Table')
  async foreignKeysBy(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Query() data: GetTableForeignKeysByDto,
  ) {
    return transformFromPaginatedPrismaToTableModel(
      await this.tableApi.resolveTableForeignKeysBy({
        ...data,
        revisionId,
        tableId,
      }),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('count-foreign-keys-to')
  @ApiRevisionTableParams()
  @ApiOperation({
    operationId: 'tableCountForeignKeysTo',
    summary: 'Count tables this table references',
  })
  @ApiOkResponse({ type: Number })
  @ApiCommonErrors()
  @ApiNotFoundError('Table')
  async countForeignKeysTo(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
  ) {
    return this.tableApi.resolveTableCountForeignKeysTo({
      revisionId,
      tableId,
    });
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('foreign-keys-to')
  @ApiRevisionTableParams()
  @ApiOperation({
    operationId: 'tableForeignKeysTo',
    summary: 'List tables this table references',
  })
  @ApiOkResponse({ type: TablesConnection })
  @ApiCommonErrors()
  @ApiNotFoundError('Table')
  async foreignKeysTo(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Query() data: GetTableForeignKeysToDto,
  ) {
    return transformFromPaginatedPrismaToTableModel(
      await this.tableApi.resolveTableForeignKeysTo({
        ...data,
        revisionId,
        tableId,
      }),
    );
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Table,
  })
  @Delete()
  @ApiDraftRevisionTableParams()
  @ApiOperation({ operationId: 'deleteTable', summary: 'Delete a table' })
  @ApiOkResponse({ type: BranchModel })
  @ApiCommonErrors()
  @ApiNotFoundError('Table')
  async deleteTable(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
  ): Promise<BranchModel> {
    const result = await this.draftApi.apiRemoveTable({ revisionId, tableId });

    return transformFromPrismaToBranchModel(result.branch);
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Table,
  })
  @Patch()
  @ApiDraftRevisionTableParams()
  @ApiOperation({
    operationId: 'updateTable',
    summary: 'Update table schema using JSON Patch',
  })
  @ApiBody({ type: UpdateTableDto })
  @ApiOkResponse({ type: UpdateTableResponse })
  @ApiCommonErrors()
  @ApiNotFoundError('Table')
  async updateTable(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Body() data: UpdateTableDto,
  ): Promise<UpdateTableResponse> {
    const result = await this.draftApi.apiUpdateTable({
      revisionId,
      tableId,
      patches: data.patches,
    });

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
  @ApiDraftRevisionTableParams()
  @ApiOperation({ operationId: 'renameTable', summary: 'Rename a table' })
  @ApiBody({ type: RenameTableDto })
  @ApiOkResponse({ type: RenameTableResponse })
  @ApiCommonErrors()
  @ApiNotFoundError('Table')
  async renameTable(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Body() data: RenameTableDto,
  ): Promise<RenameTableResponse> {
    const result = await this.draftApi.apiRenameTable({
      revisionId,
      tableId,
      nextTableId: data.nextTableId,
    });

    return {
      table: result.table
        ? transformFromPrismaToTableModel(result.table)
        : undefined,
      previousVersionTableId: result.previousVersionTableId,
    };
  }

  private resolveTable(revisionId: string, tableId: string): Promise<Table> {
    return this.tableApi.getTable({ revisionId, tableId });
  }
}
