import { ApiProperty } from '@nestjs/swagger';
import { RowModel } from 'src/api/rest-api/row/model';
import { TableModel } from 'src/api/rest-api/table/model/table.model';

export class CreateRowResponse {
  @ApiProperty({ type: TableModel, required: true })
  table: TableModel;

  @ApiProperty()
  previousVersionTableId: string;

  @ApiProperty({ type: RowModel, required: true })
  row: TableModel;
}
