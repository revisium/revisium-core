import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Paginated } from 'src/api/rest-api/share/model/paginated.model';

export class RowModel {
  @ApiProperty()
  createdId: string;

  @ApiProperty()
  id: string;

  @ApiProperty()
  versionId: string;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;

  @ApiProperty({ type: Date })
  publishedAt: Date;

  @ApiProperty()
  readonly: boolean;

  @ApiProperty({ type: 'object', additionalProperties: true })
  data: Prisma.JsonValue;
}

export class RowsConnection extends Paginated(RowModel, 'RowModel') {}
