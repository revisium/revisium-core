import { ApiProperty } from '@nestjs/swagger';

export class CountModelDto {
  @ApiProperty({
    type: Number,
    example: 42,
  })
  count: number;
}
