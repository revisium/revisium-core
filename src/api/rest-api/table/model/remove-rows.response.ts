import { ApiProperty } from '@nestjs/swagger';
import { BranchModel } from 'src/api/rest-api/branch/model';
import { TableModel } from 'src/api/rest-api/table/model/table.model';

export class RemoveRowsResponse {
  @ApiProperty({ type: BranchModel })
  branch: BranchModel;

  @ApiProperty({ type: TableModel, required: false })
  table?: TableModel;

  @ApiProperty({ required: false })
  previousVersionTableId?: string;
}
