import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from 'src/__generated__/client';
import { Paginated } from 'src/api/rest-api/share/model/paginated.model';

export class RowModel {
  @ApiProperty({
    description: 'Original row identifier when first created',
    example: 'post-001',
  })
  createdId: string;

  @ApiProperty({
    description: 'Current row identifier (may differ from createdId if renamed)',
    example: 'post-001',
  })
  id: string;

  @ApiProperty({
    description:
      'Internal version identifier. Changes when row data is modified.',
    example: 'V1StGXR8_Z5jdHi6B-myT',
  })
  versionId: string;

  @ApiProperty({
    description: 'Timestamp when the row was first created',
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
      'Timestamp when the row was first published (committed). Null if never committed.',
    type: Date,
    nullable: true,
    example: '2024-01-16T09:00:00.000Z',
  })
  publishedAt: Date;

  @ApiProperty({
    description:
      'Whether the row is read-only (true in committed revisions, false in draft)',
  })
  readonly: boolean;

  @ApiProperty({
    description: 'Row data matching the table schema',
    type: 'object',
    additionalProperties: true,
    example: { title: 'Hello World', content: 'My first post', status: 'draft' },
  })
  data: Prisma.JsonValue;
}

export class RowsConnection extends Paginated(RowModel, 'RowModel') {}
