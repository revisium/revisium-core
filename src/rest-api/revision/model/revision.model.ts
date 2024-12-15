import { ApiProperty } from '@nestjs/swagger';
import { Paginated } from 'src/rest-api/share/model/paginated.model';

export class RevisionModel {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Boolean })
  isDraft: boolean;

  @ApiProperty({ type: Boolean })
  isHead: boolean;
}

export class RevisionsConnection extends Paginated(
  RevisionModel,
  'RevisionModel',
) {}
