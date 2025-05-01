import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  NotFoundException,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { OptionalHttpJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-http-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { HTTPProjectGuard } from 'src/features/auth/guards/project.guard';
import { ApiRemoveRowCommand } from 'src/features/draft/commands/impl/api-remove-row.command';
import {
  ApiRenameRowCommand,
  ApiRenameRowCommandReturnType,
} from 'src/features/draft/commands/impl/api-rename-row.command';
import { ApiUpdateRowCommand } from 'src/features/draft/commands/impl/api-update-row.command';
import {
  ApiUploadFileCommand,
  ApiUploadFileCommandReturnType,
} from 'src/features/draft/commands/impl/api-upload-file.command';
import { ApiRemoveRowHandlerReturnType } from 'src/features/draft/commands/types/api-remove-row.handler.types';
import { ApiUpdateRowHandlerReturnType } from 'src/features/draft/commands/types/api-update-row.handler.types';
import { RestMetricsInterceptor } from 'src/infrastructure/metrics/rest/rest-metrics.interceptor';
import {
  GetRowForeignKeysByDto,
  RenameRowDto,
  UpdateRowDto,
} from 'src/api/rest-api/row/dto';
import { GetRowForeignKeysToDto } from 'src/api/rest-api/row/dto/get-row-foreign-keys-to.dto';
import {
  RemoveRowResponse,
  RenameRowResponse,
  RowModel,
  RowsConnection,
  UpdateRowResponse,
} from 'src/api/rest-api/row/model';
import { ErrorModel } from 'src/api/rest-api/share/model/error.model';
import { transformFromPrismaToBranchModel } from 'src/api/rest-api/share/utils/transformFromPrismaToBranchModel';
import {
  transformFromPaginatedPrismaToRowModel,
  transformFromPrismaToRowModel,
} from 'src/api/rest-api/share/utils/transformFromPrismaToRowModel';
import { transformFromPrismaToTableModel } from 'src/api/rest-api/share/utils/transformFromPrismaToTableModel';
import {
  GetRowQuery,
  ResolveRowCountForeignKeysByQuery,
  ResolveRowCountForeignKeysToQuery,
  ResolveRowForeignKeysByQuery,
  ResolveRowForeignKeysToQuery,
} from 'src/features/row/queries/impl';
import { GetRowReturnType } from 'src/features/row/queries/types';

@UseInterceptors(RestMetricsInterceptor)
@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Controller('revision/:revisionId/tables/:tableId/rows/:rowId')
@ApiBearerAuth('access-token')
@ApiTags('Row')
export class RowByIdController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get()
  @ApiOperation({ operationId: 'row' })
  @ApiOkResponse({ type: RowModel })
  @ApiNotFoundResponse({ description: 'Row not found', type: ErrorModel })
  async row(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
  ) {
    const row = await this.resolveRow(revisionId, tableId, rowId);

    if (!row) {
      throw new NotFoundException('Row not found');
    }

    return transformFromPrismaToRowModel(row);
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('count-foreign-keys-by')
  @ApiOperation({ operationId: 'rowCountForeignKeysBy' })
  @ApiOkResponse({
    type: Number,
  })
  async countForeignKeysBy(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
  ) {
    return this.queryBus.execute(
      new ResolveRowCountForeignKeysByQuery({ revisionId, tableId, rowId }),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('foreign-keys-by')
  @ApiOperation({ operationId: 'rowForeignKeysBy' })
  @ApiOkResponse({ type: RowsConnection })
  async foreignKeysBy(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
    @Query() data: GetRowForeignKeysByDto,
  ) {
    return transformFromPaginatedPrismaToRowModel(
      await this.queryBus.execute(
        new ResolveRowForeignKeysByQuery({
          revisionId,
          tableId,
          rowId,
          foreignKeyByTableId: data.foreignKeyByTableId,
          after: data.after,
          first: data.first,
        }),
      ),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('count-foreign-keys-to')
  @ApiOperation({ operationId: 'rowCountForeignKeysTo' })
  @ApiOkResponse({
    type: Number,
  })
  async countForeignKeysTo(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
  ) {
    return this.queryBus.execute(
      new ResolveRowCountForeignKeysToQuery({ revisionId, tableId, rowId }),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('foreign-keys-to')
  @ApiOperation({ operationId: 'rowForeignKeysTo' })
  @ApiOkResponse({ type: RowsConnection })
  async foreignKeysTo(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
    @Query() data: GetRowForeignKeysToDto,
  ) {
    return transformFromPaginatedPrismaToRowModel(
      await this.queryBus.execute(
        new ResolveRowForeignKeysToQuery({
          revisionId,
          tableId,
          rowId,
          foreignKeyToTableId: data.foreignKeyToTableId, // TODO naming
          after: data.after,
          first: data.first,
        }),
      ),
    );
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Row,
  })
  @Delete()
  @ApiOperation({ operationId: 'deleteRow' })
  @ApiOkResponse({ type: RemoveRowResponse })
  async deleteRow(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
  ): Promise<RemoveRowResponse> {
    const result = await this.commandBus.execute<
      ApiRemoveRowCommand,
      ApiRemoveRowHandlerReturnType
    >(new ApiRemoveRowCommand({ revisionId, tableId, rowId }));

    return {
      branch: transformFromPrismaToBranchModel(result.branch),
      table: result.table
        ? transformFromPrismaToTableModel(result.table)
        : undefined,
      previousVersionTableId: result.previousVersionTableId,
    };
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Row,
  })
  @Put()
  @ApiOperation({ operationId: 'updateRow' })
  @ApiBody({ type: UpdateRowDto })
  @ApiOkResponse({ type: UpdateRowResponse })
  async updateRow(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
    @Body() data: UpdateRowDto,
  ): Promise<UpdateRowResponse> {
    const result = await this.commandBus.execute<
      ApiUpdateRowCommand,
      ApiUpdateRowHandlerReturnType
    >(
      new ApiUpdateRowCommand({
        revisionId,
        tableId,
        rowId,
        data: data.data,
      }),
    );

    return {
      table: result.table
        ? transformFromPrismaToTableModel(result.table)
        : undefined,
      previousVersionTableId: result.previousVersionTableId,
      row: result.row ? transformFromPrismaToRowModel(result.row) : undefined,
      previousVersionRowId: result.previousVersionRowId,
    };
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Row,
  })
  @Patch('rename')
  @ApiOperation({ operationId: 'renameRow' })
  @ApiBody({ type: RenameRowDto })
  @ApiOkResponse({ type: RenameRowResponse })
  async renameRow(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
    @Body() data: RenameRowDto,
  ): Promise<RenameRowResponse> {
    const result = await this.commandBus.execute<
      ApiRenameRowCommand,
      ApiRenameRowCommandReturnType
    >(
      new ApiRenameRowCommand({
        revisionId,
        tableId,
        rowId,
        nextRowId: data.nextRowId,
      }),
    );

    return {
      table: result.table
        ? transformFromPrismaToTableModel(result.table)
        : undefined,
      previousVersionTableId: result.previousVersionTableId,
      row: result.row ? transformFromPrismaToRowModel(result.row) : undefined,
      previousVersionRowId: result.previousVersionRowId,
    };
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Row,
  })
  @ApiOperation({ operationId: 'uploadFile' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @Post('upload/:fileId')
  @ApiOkResponse({ type: UpdateRowResponse }) // TODO
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
    @Param('fileId') fileId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 }),
          // new FileTypeValidator({ fileType: 'image/*' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const result = await this.commandBus.execute<
      ApiUploadFileCommand,
      ApiUploadFileCommandReturnType
    >(
      new ApiUploadFileCommand({
        revisionId,
        tableId,
        rowId,
        fileId,
        file,
      }),
    );

    return {
      table: result.table
        ? transformFromPrismaToTableModel(result.table)
        : undefined,
      previousVersionTableId: result.previousVersionTableId,
      row: result.row ? transformFromPrismaToRowModel(result.row) : undefined,
      previousVersionRowId: result.previousVersionRowId,
    };
  }

  private resolveRow(revisionId: string, tableId: string, rowId: string) {
    return this.queryBus.execute<GetRowQuery, GetRowReturnType>(
      new GetRowQuery({ revisionId, tableId, rowId }),
    );
  }
}
