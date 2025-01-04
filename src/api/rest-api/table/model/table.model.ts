import { ApiProperty } from '@nestjs/swagger';
import { Paginated } from 'src/api/rest-api/share/model/paginated.model';

export class TableModel {
  @ApiProperty()
  versionId: string;

  @ApiProperty()
  id: string;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty()
  readonly: boolean;
}

export class TablesConnection extends Paginated(TableModel, 'TableModel') {}
