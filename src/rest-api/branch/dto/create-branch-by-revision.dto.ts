import { ApiProperty } from '@nestjs/swagger';

export class CreateBranchByRevisionDto {
  @ApiProperty()
  branchName: string;
}
