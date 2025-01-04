import { ApiProperty } from '@nestjs/swagger';
import { Paginated } from 'src/api/rest-api/share/model/paginated.model';

export class BranchModel {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty()
  isRoot: boolean;

  @ApiProperty()
  name: string;
}

export class BranchesConnection extends Paginated(BranchModel, 'BranchModel') {}
