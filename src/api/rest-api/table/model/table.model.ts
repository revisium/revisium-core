import { ApiProperty } from '@nestjs/swagger';
import { Paginated } from 'src/api/rest-api/share/model/paginated.model';

export class TableModel {
  @ApiProperty({
    description: 'Original table identifier when first created',
    example: 'posts',
  })
  createdId: string;

  @ApiProperty({
    description:
      'Current table identifier (may differ from createdId if renamed)',
    example: 'posts',
  })
  id: string;

  @ApiProperty({
    description:
      'Internal version identifier. Changes when table schema or data is modified.',
    example: 'V1StGXR8_Z5jdHi6B-myT',
  })
  versionId: string;

  @ApiProperty({
    description: 'Timestamp when the table was first created',
    type: Date,
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp of the last modification',
    type: Date,
    example: '2024-01-20T14:45:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description:
      'Whether the table is read-only (true in committed revisions, false in draft)',
  })
  readonly: boolean;
}

export class TablesConnection extends Paginated(TableModel, 'TableModel') {}
