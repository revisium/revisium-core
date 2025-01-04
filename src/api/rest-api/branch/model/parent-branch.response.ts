import { ApiProperty } from '@nestjs/swagger';
class Id {
  @ApiProperty()
  id: string;
}

export class ParentBranchResponse {
  @ApiProperty({ type: Id })
  branch: Id;

  @ApiProperty({ type: Id })
  revision: Id;
}
