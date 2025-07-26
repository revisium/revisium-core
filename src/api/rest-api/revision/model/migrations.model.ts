import { ApiProperty } from '@nestjs/swagger';

export class MigrationsModel {
  @ApiProperty()
  tableId: string;

  @ApiProperty()
  hash: string;

  @ApiProperty()
  date: string;

  @ApiProperty()
  patches: object[];
}
