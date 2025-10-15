import { ApiProperty } from '@nestjs/swagger';
import { RowModel } from 'src/api/rest-api/row/model/row.model';
import { TableModel } from 'src/api/rest-api/table/model/table.model';

export class PatchRowResponse {
  @ApiProperty({ type: TableModel, required: false })
  table?: TableModel;

  @ApiProperty({ required: false })
  previousVersionTableId?: string;

  @ApiProperty({ type: RowModel, required: false })
  row?: RowModel;

  @ApiProperty({ required: false })
  previousVersionRowId?: string;
}
