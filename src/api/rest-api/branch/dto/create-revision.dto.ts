import { ApiProperty } from '@nestjs/swagger';

export class CreateRevisionDto {
  @ApiProperty({ required: false, default: '' })
  comment?: string;
}
