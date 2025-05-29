import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SuccessModelDto {
  @ApiProperty({
    type: Boolean,
    example: true,
  })
  @IsBoolean({ message: 'success must be a boolean' })
  success: boolean;
}
