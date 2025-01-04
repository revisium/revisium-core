import { ApiProperty } from '@nestjs/swagger';
import { BranchModel } from 'src/api/rest-api/branch/model';
import { TableModel } from 'src/api/rest-api/table/model/table.model';

export class CreateTableResponse {
  @ApiProperty({ type: BranchModel })
  branch: BranchModel;

  @ApiProperty({ type: TableModel })
  table: TableModel;
}
