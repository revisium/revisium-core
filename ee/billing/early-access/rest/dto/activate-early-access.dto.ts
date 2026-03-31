import { ApiProperty } from '@nestjs/swagger';

export class ActivateEarlyAccessDto {
  @ApiProperty({ example: 'pro' })
  planId: string;
}
