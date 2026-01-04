import { ApiProperty } from '@nestjs/swagger';
import { Paginated } from 'src/api/rest-api/share/model/paginated.model';

export class RevisionModel {
  @ApiProperty({
    description: 'Unique revision identifier',
    example: 'V1StGXR8_Z5jdHi6B-myT',
  })
  id: string;

  @ApiProperty({
    description: 'Timestamp when the revision was created',
    type: Date,
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description:
      'Whether this is the draft revision. Draft revisions can be modified; use for all write operations.',
    type: Boolean,
  })
  isDraft: boolean;

  @ApiProperty({
    description:
      'Whether this is the head (latest committed) revision. Head is immutable and represents the published state.',
    type: Boolean,
  })
  isHead: boolean;
}

export class RevisionsConnection extends Paginated(
  RevisionModel,
  'RevisionModel',
) {}
