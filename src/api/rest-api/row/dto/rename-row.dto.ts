import { ApiProperty } from '@nestjs/swagger';

export class RenameRowDto {
  @ApiProperty()
  nextRowId: string;
}
