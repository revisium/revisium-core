import { ApiProperty } from '@nestjs/swagger';
import { TableModel } from 'src/api/rest-api/table/model/table.model';

export class UpdateTableResponse {
  @ApiProperty({ type: TableModel, required: false })
  table?: TableModel;

  @ApiProperty()
  previousVersionTableId: string;
}
