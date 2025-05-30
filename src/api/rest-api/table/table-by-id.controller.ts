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
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Table } from '@prisma/client';
import { mapToPrismaOrderBy } from 'src/api/rest-api/share/utils/mapToPrismaOrderBy';
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
  GetTableForeignKeysByDto,
  GetTableForeignKeysToDto,
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
  ResolveTableCountForeignKeysByQuery,
  ResolveTableCountForeignKeysToQuery,
  ResolveTableForeignKeysByQuery,
  ResolveTableForeignKeysToQuery,
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
    const table = await this.resolveTable(revisionId, tableId);

    const prismaOrderBy = mapToPrismaOrderBy(orderBy);

    return transformFromPaginatedPrismaToRowModel(
      await this.queryBus.execute(
        new GetRowsByTableQuery({
          revisionId,
          tableId,
          tableVersionId: table.versionId,
          ...data,
          orderBy: prismaOrderBy,
          where,
        }),
      ),
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
  @Get('count-foreign-keys-by')
  @ApiOperation({ operationId: 'tableCountForeignKeysBy' })
  @ApiOkResponse({
    type: Number,
  })
  async countForeignKeysBy(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
  ) {
    return this.queryBus.execute(
      new ResolveTableCountForeignKeysByQuery({ revisionId, tableId }),
    );
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
      await this.queryBus.execute(
        new ResolveTableForeignKeysByQuery({ revisionId, tableId, ...data }),
      ),
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
    return this.queryBus.execute(
      new ResolveTableCountForeignKeysToQuery({ revisionId, tableId }),
    );
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
      await this.queryBus.execute(
        new ResolveTableForeignKeysToQuery({ revisionId, tableId, ...data }),
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
