import {
  Body,
  Controller,
  Delete,
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
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiCommonErrors,
  ApiDraftRevisionTableRowParams,
  ApiFileIdParam,
  ApiNotFoundError,
  ApiRevisionTableRowParams,
} from 'src/api/rest-api/share/decorators';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { OptionalHttpJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-http-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { HTTPProjectGuard } from 'src/features/auth/guards/project.guard';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import { RowApiService } from 'src/features/row/row-api.service';
import { RestMetricsInterceptor } from 'src/infrastructure/metrics/rest/rest-metrics.interceptor';
import {
  GetRowForeignKeysByDto,
  PatchRowDto,
  RenameRowDto,
  UpdateRowDto,
} from 'src/api/rest-api/row/dto';
import { GetRowForeignKeysToDto } from 'src/api/rest-api/row/dto/get-row-foreign-keys-to.dto';
import {
  PatchRowResponse,
  RemoveRowResponse,
  RenameRowResponse,
  RowModel,
  RowsConnection,
  UpdateRowResponse,
  UploadFileResponse,
} from 'src/api/rest-api/row/model';
import { CountModelDto } from 'src/api/rest-api/share/model/count.model';
import { transformFromPrismaToBranchModel } from 'src/api/rest-api/share/utils/transformFromPrismaToBranchModel';
import {
  transformFromPaginatedPrismaToRowModel,
  transformFromPrismaToRowModel,
} from 'src/api/rest-api/share/utils/transformFromPrismaToRowModel';
import { transformFromPrismaToTableModel } from 'src/api/rest-api/share/utils/transformFromPrismaToTableModel';

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
    private readonly draftApi: DraftApiService,
    private readonly rowApi: RowApiService,
  ) {}

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get()
  @ApiRevisionTableRowParams()
  @ApiOperation({ operationId: 'row', summary: 'Get row by ID' })
  @ApiOkResponse({ type: RowModel })
  @ApiCommonErrors()
  @ApiNotFoundError('Row')
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
  @ApiRevisionTableRowParams()
  @ApiOperation({
    operationId: 'rowCountForeignKeysBy',
    summary: 'Count rows that reference this row',
  })
  @ApiOkResponse({ type: CountModelDto })
  @ApiCommonErrors()
  @ApiNotFoundError('Row')
  async countForeignKeysBy(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
  ): Promise<CountModelDto> {
    return {
      count: await this.rowApi.resolveRowCountForeignKeysBy({
        revisionId,
        tableId,
        rowId,
      }),
    };
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('foreign-keys-by')
  @ApiRevisionTableRowParams()
  @ApiOperation({
    operationId: 'rowForeignKeysBy',
    summary: 'List rows that reference this row',
  })
  @ApiOkResponse({ type: RowsConnection })
  @ApiCommonErrors()
  @ApiNotFoundError('Row')
  async foreignKeysBy(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
    @Query() data: GetRowForeignKeysByDto,
  ) {
    return transformFromPaginatedPrismaToRowModel(
      await this.rowApi.resolveRowForeignKeysBy({
        revisionId,
        tableId,
        rowId,
        foreignKeyByTableId: data.foreignKeyByTableId,
        after: data.after,
        first: data.first,
      }),
    );
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('count-foreign-keys-to')
  @ApiRevisionTableRowParams()
  @ApiOperation({
    operationId: 'rowCountForeignKeysTo',
    summary: 'Count rows this row references',
  })
  @ApiOkResponse({ type: CountModelDto })
  @ApiCommonErrors()
  @ApiNotFoundError('Row')
  async countForeignKeysTo(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
  ): Promise<CountModelDto> {
    return {
      count: await this.rowApi.resolveRowCountForeignKeysTo({
        revisionId,
        tableId,
        rowId,
      }),
    };
  }

  @UseGuards(OptionalHttpJwtAuthGuard, HTTPProjectGuard)
  @Get('foreign-keys-to')
  @ApiRevisionTableRowParams()
  @ApiOperation({
    operationId: 'rowForeignKeysTo',
    summary: 'List rows this row references',
  })
  @ApiOkResponse({ type: RowsConnection })
  @ApiCommonErrors()
  @ApiNotFoundError('Row')
  async foreignKeysTo(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
    @Query() data: GetRowForeignKeysToDto,
  ) {
    return transformFromPaginatedPrismaToRowModel(
      await this.rowApi.resolveRowForeignKeysTo({
        revisionId,
        tableId,
        rowId,
        foreignKeyToTableId: data.foreignKeyToTableId, // TODO naming
        after: data.after,
        first: data.first,
      }),
    );
  }

  @UseGuards(HttpJwtAuthGuard, HTTPProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Row,
  })
  @Delete()
  @ApiDraftRevisionTableRowParams()
  @ApiOperation({ operationId: 'deleteRow', summary: 'Delete a row' })
  @ApiOkResponse({ type: RemoveRowResponse })
  @ApiCommonErrors()
  @ApiNotFoundError('Row')
  async deleteRow(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
  ): Promise<RemoveRowResponse> {
    const result = await this.draftApi.apiRemoveRow({
      revisionId,
      tableId,
      rowId,
    });

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
  @ApiDraftRevisionTableRowParams()
  @ApiOperation({ operationId: 'updateRow', summary: 'Replace row data' })
  @ApiBody({ type: UpdateRowDto })
  @ApiOkResponse({ type: UpdateRowResponse })
  @ApiCommonErrors()
  @ApiNotFoundError('Row')
  async updateRow(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
    @Body() data: UpdateRowDto,
  ): Promise<UpdateRowResponse> {
    const result = await this.draftApi.apiUpdateRow({
      revisionId,
      tableId,
      rowId,
      data: data.data,
    });

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
  @Patch()
  @ApiDraftRevisionTableRowParams()
  @ApiOperation({
    operationId: 'patchRow',
    summary: 'Patch row data using JSON Patch',
  })
  @ApiBody({ type: PatchRowDto })
  @ApiOkResponse({ type: PatchRowResponse })
  @ApiCommonErrors()
  @ApiNotFoundError('Row')
  async patchRow(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
    @Body() data: PatchRowDto,
  ): Promise<PatchRowResponse> {
    const result = await this.draftApi.apiPatchRow({
      revisionId,
      tableId,
      rowId,
      patches: data.patches,
    });

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
  @ApiDraftRevisionTableRowParams()
  @ApiOperation({ operationId: 'renameRow', summary: 'Rename a row' })
  @ApiBody({ type: RenameRowDto })
  @ApiOkResponse({ type: RenameRowResponse })
  @ApiCommonErrors()
  @ApiNotFoundError('Row')
  async renameRow(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
    @Body() data: RenameRowDto,
  ): Promise<RenameRowResponse> {
    const result = await this.draftApi.apiRenameRow({
      revisionId,
      tableId,
      rowId,
      nextRowId: data.nextRowId,
    });

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
  @Post('upload/:fileId')
  @ApiDraftRevisionTableRowParams()
  @ApiFileIdParam()
  @ApiOperation({
    operationId: 'uploadFile',
    summary: 'Upload a file to a row field',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File to upload (max 50MB)',
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
  @ApiOkResponse({ type: UploadFileResponse })
  @ApiCommonErrors()
  @ApiNotFoundError('Row or File field')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('revisionId') revisionId: string,
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
    @Param('fileId') fileId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 50 })],
      }),
    )
    file: Express.Multer.File,
  ) {
    const result = await this.draftApi.apiUploadFile({
      revisionId,
      tableId,
      rowId,
      fileId,
      file,
    });

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
    return this.rowApi.getRow({ revisionId, tableId, rowId });
  }
}
