import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Paginated } from 'src/api/rest-api/share/model/paginated.model';

export class RowModel {
  @ApiProperty()
  versionId: string;

  @ApiProperty()
  id: string;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty()
  readonly: boolean;

  @ApiProperty({ type: 'object' })
  data: Prisma.JsonValue;
}

export class RowsConnection extends Paginated(RowModel, 'RowModel') {}
