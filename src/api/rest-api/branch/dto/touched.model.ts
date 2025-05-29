import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class TouchedModelDto {
  @ApiProperty({
    type: Boolean,
    example: true,
  })
  @IsBoolean({ message: 'touched must be a boolean' })
  touched: boolean;
}
