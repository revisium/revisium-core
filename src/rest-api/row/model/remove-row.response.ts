import { ApiProperty } from '@nestjs/swagger';
import { BranchModel } from 'src/rest-api/branch/model';
import { TableModel } from 'src/rest-api/table/model/table.model';

export class RemoveRowResponse {
  @ApiProperty({ type: BranchModel })
  branch: BranchModel;

  @ApiProperty({ type: TableModel, required: false })
  table?: TableModel;

  @ApiProperty({ required: false })
  previousVersionTableId?: string;
}
