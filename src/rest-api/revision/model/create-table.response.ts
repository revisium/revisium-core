import { ApiProperty } from '@nestjs/swagger';
import { BranchModel } from 'src/rest-api/branch/model';
import { TableModel } from 'src/rest-api/table/model/table.model';

export class CreateTableResponse {
  @ApiProperty({ type: BranchModel })
  branch: BranchModel;

  @ApiProperty({ type: TableModel })
  table: TableModel;
}
