import { ApiProperty } from '@nestjs/swagger';
import { Paginated } from 'src/api/rest-api/share/model/paginated.model';

export class BranchModel {
  @ApiProperty({
    description: 'Unique branch identifier',
    example: 'V1StGXR8_Z5jdHi6B-myT',
  })
  id: string;

  @ApiProperty({
    description: 'Project this branch belongs to',
    example: 'X2TuHYS9_A6keJj7C-nzU',
  })
  projectId: string;

  @ApiProperty({
    description: 'Timestamp when the branch was created',
    type: Date,
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description:
      'Whether this is the root (default) branch of the project. Each project has exactly one root branch.',
  })
  isRoot: boolean;

  @ApiProperty({
    description: 'Branch name',
    example: 'master',
  })
  name: string;
}

export class BranchesConnection extends Paginated(BranchModel, 'BranchModel') {}
