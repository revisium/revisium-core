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
  @ApiOperation({ operationId: 'rows' })
  @ApiOkResponse({ type: RowsConnection })
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
  @ApiOperation({ operationId: 'createRow' })
  @ApiBody({ type: CreateRowDto })
  @ApiOkResponse({ type: CreateRowResponse })
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
  @ApiOperation({ operationId: 'createRows' })
  @ApiBody({ type: CreateRowsDto })
  @ApiOkResponse({ type: CreateRowsResponse })
  async createRows(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Body() data: CreateRowsDto,
  ): Promise<CreateRowsResponse> {
    const result = await this.draftApi.apiCreateRows({
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
    action: PermissionAction.update,
    subject: PermissionSubject.Row,
  })
  @Patch('update-rows')
  @ApiOperation({ operationId: 'updateRows' })
  @ApiBody({ type: UpdateRowsDto })
  @ApiOkResponse({ type: UpdateRowsResponse })
  async updateRows(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Body() data: UpdateRowsDto,
  ): Promise<UpdateRowsResponse> {
    const result = await this.draftApi.apiUpdateRows({
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
    action: PermissionAction.update,
    subject: PermissionSubject.Row,
  })
  @Patch('patch-rows')
  @ApiOperation({ operationId: 'patchRows' })
  @ApiBody({ type: PatchRowsDto })
  @ApiOkResponse({ type: PatchRowsResponse })
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
  @ApiOperation({ operationId: 'deleteRows' })
  @ApiBody({ type: RemoveRowsDto })
  @ApiOkResponse({ type: RemoveRowsResponse })
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
  @ApiOperation({ operationId: 'tableSchema' })
  @ApiOkResponse({
    schema: { type: 'object' },
  })
  async schema(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
  ) {
    return this.tableApi.resolveTableSchema({ revisionId, tableId });
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('count-foreign-keys-by')
  @ApiOperation({ operationId: 'tableCountForeignKeysBy' })
  @ApiOkResponse({
    type: Number,
  })
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
  @ApiOperation({ operationId: 'tableForeignKeysBy' })
  @ApiOkResponse({ type: TablesConnection })
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
  @ApiOperation({ operationId: 'tableCountForeignKeysTo' })
  @ApiOkResponse({
    type: Number,
  })
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
  @ApiOperation({ operationId: 'tableForeignKeysTo' })
  @ApiOkResponse({ type: TablesConnection })
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
  @ApiOperation({ operationId: 'deleteTable' })
  @ApiOkResponse({ type: BranchModel })
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
  @ApiOperation({ operationId: 'updateTable' })
  @ApiBody({ type: UpdateTableDto })
  @ApiOkResponse({ type: UpdateTableResponse })
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
  @ApiOperation({ operationId: 'renameTable' })
  @ApiBody({ type: UpdateTableDto })
  @ApiOkResponse({ type: UpdateTableResponse })
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
