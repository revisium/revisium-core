import { ApiProperty } from '@nestjs/swagger';

export class RenameTableDto {
  @ApiProperty()
  nextTableId: string;
}
